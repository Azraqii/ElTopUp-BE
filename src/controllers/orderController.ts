import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../lib/prisma';
import { syncUserToDatabase } from '../utils/syncUser';
import { validateGamepass, syncRobuxshipStatus, createRobuxshipOrder } from '../services/robuxshipService';
import { createSnapTransaction } from '../services/midtransService';

const GAMEPASS_ERROR_TRANSLATIONS: Record<string, string> = {
  'gamepass has regional pricing on': 'Gamepass kamu menggunakan harga regional (Regional Pricing). Matikan Regional Pricing di pengaturan Roblox terlebih dahulu.',
  'gamepass not found': 'Gamepass tidak ditemukan. Pastikan kamu sudah membuat gamepass dengan harga yang sesuai.',
  'user not found': 'Username Roblox tidak ditemukan. Periksa kembali username yang kamu masukkan.',
  'invalid amount': 'Jumlah Robux tidak valid.',
  'gamepass price mismatch': 'Harga gamepass tidak sesuai. Pastikan harga gamepass sama persis dengan jumlah yang diminta.',
  'gamepass is not on sale': 'Gamepass belum dijual. Aktifkan penjualan gamepass di pengaturan Roblox.',
  'gamepass is disabled': 'Gamepass dinonaktifkan. Aktifkan kembali gamepass kamu di Roblox.',
};

function translateGamepassError(message: string): string {
  const lower = message.toLowerCase();
  for (const [key, translation] of Object.entries(GAMEPASS_ERROR_TRANSLATIONS)) {
    if (lower.includes(key)) return translation;
  }
  return message;
}


// Konfigurasi Rate Harga — 4.7 USD per 1000 Gross Robux
const RATE_USD_PER_1K_GROSS_ROBUX = 4.7;
const RATE_IDR_PER_USD = 16950;

// ------------------------------------------------------------------
// POST /api/orders/checkout
// Phase 1-3: Validation & UNPAID Order Creation
// ------------------------------------------------------------------
export const checkout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supabaseUser = req.user;
    const user = await syncUserToDatabase(supabaseUser);

    // 1. Terima input dinamis dari frontend (NET Robux yang user inginkan)
    const { robloxUsername, robuxAmount } = req.body as {
      robloxUsername: string;
      robuxAmount: number;
    };

    if (!robloxUsername || !robuxAmount || robuxAmount < 50) {
      res.status(400).json({ error: 'Username dan nominal Robux (minimal 50) wajib diisi.' });
      return;
    }

    // 2. Kalkulasi Pajak 30% Roblox untuk Gamepass (GROSS = pembulatan ke atas dari NET / 0.7)
    const grossRobuxAmount = Math.ceil(robuxAmount / 0.7);

    // 3. Kalkulasi Harga IDR berdasarkan GROSS amount
    // Formula: totalPriceIdr = Math.ceil((grossAmount / 1000) * (4.7 * 16950))
    const totalPriceIdr = Math.ceil((grossRobuxAmount / 1000) * (RATE_USD_PER_1K_GROSS_ROBUX * RATE_IDR_PER_USD));

    // 4. Validate gamepass via RobuxShip menggunakan harga GROSS
    let gamepassData;
    try {
      gamepassData = await validateGamepass(robloxUsername, grossRobuxAmount);
    } catch (validationError: any) {
      await prisma.systemLog.create({
        data: {
          serviceName: 'ROBUXSHIP',
          eventType: 'VALIDATE_GAMEPASS_FAILED',
          payloadData: { 
            username: robloxUsername, 
            requestedNet: robuxAmount, 
            requiredGross: grossRobuxAmount, 
            error: validationError.message 
          },
          status: 'ERROR',
        },
      });
      res.status(400).json({
        error: translateGamepassError(validationError.message),
        requiredGrossPrice: grossRobuxAmount,
      });
      return;
    }

    // 5. Create UNPAID Order record dengan data validasi RobuxShip
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        robuxAmount: robuxAmount, // NET Robux yang user inginkan
        robloxUsername,
        robloxGamepassId: gamepassData.gamepassId?.toString(),
        paymentStatus: 'UNPAID',
        robuxshipStatus: 'PENDING',
        customerPriceIdr: totalPriceIdr,
        robuxshipCostUsd: gamepassData.cost,
      },
    });

    // 6. Log sukses validasi
    await prisma.systemLog.create({
      data: {
        orderId: order.id,
        serviceName: 'ROBUXSHIP',
        eventType: 'VALIDATE_GAMEPASS_SUCCESS',
        payloadData: { 
          gamepassId: gamepassData.gamepassId,
          username: robloxUsername,
          netRobux: robuxAmount,
          grossRobux: grossRobuxAmount,
          priceIdr: totalPriceIdr
        },
        status: 'SUCCESS',
      },
    });

    // 7. Buat transaksi pembayaran Midtrans (QRIS)
    const frontendBaseUrl = (process.env.FRONTEND_URL || 'https://eltopup.id').replace(/\/$/, '');
    const midtransOrderId = order.id;

    let snapTransaction: { token: string; redirectUrl: string };
    try {
      snapTransaction = await createSnapTransaction({
        midtransOrderId,
        grossAmountIdr: totalPriceIdr,
        customerName: user.name || user.email || 'El Top Up Customer',
        customerEmail: user.email || `${user.id}@eltopup.id`,
        description: `Top Up ${robuxAmount} Robux @${robloxUsername}`,
        callbacks: {
          finish: `${frontendBaseUrl}/pesanan/${order.id}`,
          pending: `${frontendBaseUrl}/pesanan/${order.id}`,
          error: `${frontendBaseUrl}/checkout/robux`,
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { midtransOrderId },
      });

      await prisma.systemLog.create({
        data: {
          orderId: order.id,
          serviceName: 'MIDTRANS',
          eventType: 'CREATE_SNAP_SUCCESS',
          payloadData: {
            midtransOrderId,
            redirectUrl: snapTransaction.redirectUrl,
          },
          status: 'SUCCESS',
        },
      });
    } catch (midtransError: any) {
      await prisma.systemLog.create({
        data: {
          orderId: order.id,
          serviceName: 'MIDTRANS',
          eventType: 'CREATE_SNAP_FAILED',
          payloadData: {
            message: midtransError.message,
          },
          status: 'ERROR',
        },
      });

      res.status(502).json({
        error: 'Order berhasil dibuat, tetapi gagal membuat transaksi pembayaran Midtrans.',
        details: midtransError.message,
        orderId: order.id,
      });
      return;
    }

    // 8. Return order details ke frontend
    res.status(201).json({
      success: true,
      orderId: order.id,
      netRobuxAmount: robuxAmount,
      grossRobuxAmount: grossRobuxAmount,
      totalPriceIdr: totalPriceIdr,
      gamepassId: gamepassData.gamepassId,
      payment: {
        provider: 'MIDTRANS',
        method: 'qris',
        midtransOrderId,
        snapToken: snapTransaction.token,
        snapRedirectUrl: snapTransaction.redirectUrl,
      },
      message: 'Order berhasil dibuat. Silakan lanjutkan ke pembayaran.'
    });
  } catch (err) {
    console.error('[checkout] Unexpected error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal server saat checkout.' });
  }
};

// ------------------------------------------------------------------
// GET /api/orders/:id/status
// ------------------------------------------------------------------
export const getOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supabaseUser = req.user;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.userId !== supabaseUser.sub) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    let robuxshipResult = null;
    if (order.paymentStatus === 'PAID' && order.robuxshipOrderId) {
      try {
        robuxshipResult = await syncRobuxshipStatus(id);
      } catch (err) {
        console.warn(`[getOrderStatus] Gagal sync manual dari Robuxship untuk order ${id}`);
      }
    }

    res.json({
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      robuxshipStatus: robuxshipResult?.status ?? order.robuxshipStatus,
      robuxAmount: order.robuxAmount, // Langsung ambil dari tabel Order
      customerPriceIdr: order.customerPriceIdr,
      robloxUsername: order.robloxUsername,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (err) {
    console.error('[getOrderStatus] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/orders  (user's own orders)
// ------------------------------------------------------------------
export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.sub as string;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            game: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map orders ke format yang lebih clean untuk frontend
    const mappedOrders = orders.map((order) => {
      // Format tanggal ke Bahasa Indonesia
      const date = new Date(order.createdAt);
      const formattedDate = date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Tentukan UI Status berdasarkan paymentStatus dan robuxshipStatus
      let uiStatus = 'On Progress';
      
      if (order.paymentStatus === 'UNPAID') {
        uiStatus = 'On Progress';
      } else if (order.paymentStatus === 'PAID') {
        if (order.robuxshipStatus === 'COMPLETED') {
          uiStatus = 'Completed';
        } else if (order.robuxshipStatus === 'CANCELLED') {
          uiStatus = 'Cancelled';
        } else if (order.robuxshipStatus === 'FAILED' || order.robuxshipStatus === 'ERROR') {
          uiStatus = 'Failed';
        } else {
          // PENDING, PROCESSING, atau lainnya
          uiStatus = 'On Progress';
        }
      } else if (order.paymentStatus === 'FAILED' || order.paymentStatus === 'EXPIRED' || order.paymentStatus === 'CANCELLED') {
        uiStatus = 'Failed';
      }

      return {
        id: order.id,
        orderNumber: order.midtransOrderId || order.id.substring(0, 8).toUpperCase(),
        formattedDate,
        priceIdr: order.customerPriceIdr,
        targetUsername: order.robloxUsername,
        itemName: order.product?.name || `${order.robuxAmount} Robux`,
        gameName: order.product?.game?.name || 'Roblox',
        gameImage: order.product?.game?.imageUrl || order.product?.imageUrl || '/default-game.png',
        amount: order.robuxAmount ? `${order.robuxAmount} Robux` : '1x',
        uiStatus,
        paymentStatus: order.paymentStatus,
        robuxshipStatus: order.robuxshipStatus,
      };
    });

    res.json({ orders: mappedOrders });
  } catch (err) {
    console.error('[getMyOrders] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


// ------------------------------------------------------------------
// POST /api/orders/:id/mock-pay (UNTUK TESTING - Phase 4: Payment & Fulfillment)
// ------------------------------------------------------------------
export const mockPayOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supabaseUser = req.user;

    // 1. Cari order dan validasi kepemilikan
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }

    if (order.userId !== supabaseUser.sub) {
      res.status(403).json({ error: 'Anda tidak memiliki akses ke order ini.' });
      return;
    }

    // 2. Check jika sudah PAID (prevent duplicate RobuxShip API calls)
    if (order.paymentStatus === 'PAID') {
      res.status(400).json({ 
        error: 'Order ini sudah dibayar sebelumnya.',
        orderId: order.id,
        robuxshipStatus: order.robuxshipStatus
      });
      return;
    }

    // 3. Ubah status di database menjadi PAID
    await prisma.order.update({
      where: { id },
      data: { paymentStatus: 'PAID' },
    });

    // 4. Eksekusi RobuxShip order creation untuk memproses pengiriman Robux
    try {
      await createRobuxshipOrder(id);
      
      // 5. Log sukses
      await prisma.systemLog.create({
        data: {
          orderId: id,
          serviceName: 'MOCK_PAYMENT',
          eventType: 'PAYMENT_SUCCESS',
          payloadData: { 
            message: 'Mock payment successful, RobuxShip order created'
          },
          status: 'SUCCESS',
        },
      });

      res.status(200).json({
        success: true,
        message: 'Pembayaran berhasil! Robux sedang diproses dan akan masuk dalam 1-5 menit.',
        orderId: order.id,
        robuxAmount: order.robuxAmount,
        robloxUsername: order.robloxUsername,
      });
    } catch (robuxshipError: any) {
      // Jika RobuxShip gagal, tetap kembalikan PAID tapi dengan error message
      await prisma.systemLog.create({
        data: {
          orderId: id,
          serviceName: 'ROBUXSHIP',
          eventType: 'CREATE_ORDER_FAILED_AFTER_PAYMENT',
          payloadData: { error: robuxshipError.message },
          status: 'ERROR',
        },
      });

      res.status(500).json({ 
        error: 'Pembayaran berhasil, tetapi gagal memproses pengiriman Robux. Tim kami akan menindaklanjuti.',
        details: robuxshipError.message,
        orderId: order.id
      });
    }
  } catch (err: any) {
    console.error('[mockPayOrder] Unexpected error:', err.message);
    res.status(500).json({ 
      error: 'Gagal melakukan simulasi pembayaran.',
      details: err.message
    });
  }
};