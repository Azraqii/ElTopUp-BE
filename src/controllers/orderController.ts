// src/controllers/orderController.ts
// MILESTONE 2 — ADDITIVE UPDATE
// Semua logika lama dipertahankan persis.
// Yang ditambahkan:
//   - getMyOrders: include category, handle uiStatus ITEM_GAME, expose field baru
//   - getOrderStatus: include product+meetupSlot, skip RobuxShip sync untuk ITEM_GAME
//   - mockPayOrder: handle ITEM_GAME (set adminStatus, skip RobuxShip)
//   - checkout: tambah orderType: 'ROBUX' eksplisit (aman, sudah default)

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
// Tidak berubah dari versi lama — hanya tambah orderType: 'ROBUX' eksplisit
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
            error: validationError.message,
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

    // 5. Create UNPAID Order record
    // orderType: 'ROBUX' eksplisit — sebelumnya mengandalkan default DB
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orderType: 'ROBUX', // BARU: eksplisit (sebelumnya mengandalkan @default)
        robuxAmount: robuxAmount,
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
          priceIdr: totalPriceIdr,
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
      message: 'Order berhasil dibuat. Silakan lanjutkan ke pembayaran.',
    });
  } catch (err) {
    console.error('[checkout] Unexpected error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal server saat checkout.' });
  }
};

// ------------------------------------------------------------------
// GET /api/orders/:id/status
// TAMBAHAN: include product+meetupSlot, skip RobuxShip sync untuk ITEM_GAME
// Response lama tetap ada, field baru ditambahkan
// ------------------------------------------------------------------
export const getOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supabaseUser = req.user;

    // BARU: include product dan meetupSlot untuk ITEM_GAME
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            game: { select: { name: true, slug: true } },
            category: { select: { name: true } },
          },
        },
        meetupSlot: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.userId !== supabaseUser.sub) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    // BARU: sync RobuxShip hanya untuk ROBUX yang sudah PAID
    // Lama: sync kalau PAID + robuxshipOrderId ada (tanpa cek orderType)
    let robuxshipResult = null;
    if (order.orderType === 'ROBUX' && order.paymentStatus === 'PAID' && order.robuxshipOrderId) {
      try {
        robuxshipResult = await syncRobuxshipStatus(id);
      } catch (err) {
        console.warn(`[getOrderStatus] Gagal sync manual dari Robuxship untuk order ${id}`);
      }
    }

    res.json({
      // ── Field lama — tidak berubah ────────────────────────────
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      robuxshipStatus: robuxshipResult?.status ?? order.robuxshipStatus,
      robuxAmount: order.robuxAmount,
      customerPriceIdr: order.customerPriceIdr,
      robloxUsername: order.robloxUsername,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,

      // ── Field baru — untuk ITEM_GAME ──────────────────────────
      orderType: order.orderType,
      adminStatus: order.adminStatus,
      quantity: order.quantity,
      customerWhatsapp: order.customerWhatsapp,
      product: order.product
        ? {
            name: order.product.name,
            gameName: order.product.game?.name,
            categoryName: order.product.category?.name,
            imageUrl: order.product.imageUrl,
          }
        : null,
      meetupSlot: order.meetupSlot,
      meetupScheduledAt: order.meetupScheduledAt,
      meetupWorld: order.meetupWorld,
      meetupServerCode: order.meetupServerCode,
      adminNote: order.adminNote,
      cancelReason: order.cancelReason,
      cancelRequestedAt: order.cancelRequestedAt,
      refundStatus: order.refundStatus,
    });
  } catch (err) {
    console.error('[getOrderStatus] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/orders  (user's own orders)
// TAMBAHAN: include category, handle uiStatus ITEM_GAME, expose field baru
// Semua field response lama tetap ada
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
            category: true, // BARU
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedOrders = orders.map((order) => {
      const date = new Date(order.createdAt);
      const formattedDate = date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // ── uiStatus — BARU: handle ROBUX dan ITEM_GAME ────────────
      // Lama: hanya ada logika untuk ROBUX (tapi tidak ada cek orderType,
      // jadi robuxshipStatus yang dipakai)
      let uiStatus = 'On Progress';

      if (order.orderType === 'ROBUX') {
        // Logika lama dipertahankan persis
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
            uiStatus = 'On Progress';
          }
        } else if (order.paymentStatus === 'FAILED' || order.paymentStatus === 'EXPIRED' || order.paymentStatus === 'CANCELLED') {
          uiStatus = 'Failed';
        }

      } else if (order.orderType === 'ITEM_GAME') {
        // BARU: logika untuk ITEM_GAME
        if (order.paymentStatus === 'UNPAID') {
          uiStatus = 'On Progress';
        } else if (order.paymentStatus === 'CANCELLED') {
          uiStatus = 'Cancelled';
        } else if (order.paymentStatus === 'FAILED' || order.paymentStatus === 'EXPIRED') {
          uiStatus = 'Failed';
        } else if (order.paymentStatus === 'PAID') {
          if (order.adminStatus === 'DELIVERED') {
            uiStatus = 'Completed';
          } else if (order.adminStatus === 'CANCELLED') {
            uiStatus = 'Cancelled';
          } else {
            // PENDING_ADMIN, SCHEDULED, CANCEL_REQUESTED — semua masih On Progress
            uiStatus = 'On Progress';
          }
        }
      }

      return {
        // ── Field lama — tidak berubah ──────────────────────────
        id: order.id,
        orderNumber: order.midtransOrderId || order.id.substring(0, 8).toUpperCase(),
        formattedDate,
        priceIdr: order.customerPriceIdr,
        targetUsername: order.robloxUsername,
        itemName: order.product?.name || `${order.robuxAmount} Robux`,
        gameName: order.product?.game?.name || 'Roblox',
        gameImage: order.product?.game?.imageUrl || order.product?.imageUrl || '/default-game.png',
        amount: order.robuxAmount ? `${order.robuxAmount} Robux` : `${order.quantity}x`,
        uiStatus,
        paymentStatus: order.paymentStatus,
        robuxshipStatus: order.robuxshipStatus,

        // ── Field baru ──────────────────────────────────────────
        orderType: order.orderType,
        categoryName: order.product?.category?.name || null,
        adminStatus: order.adminStatus,
        meetupScheduledAt: order.meetupScheduledAt,
        meetupWorld: order.meetupWorld,
        meetupServerCode: order.meetupServerCode,
        adminNote: order.adminNote,
        cancelReason: order.cancelReason,
        refundStatus: order.refundStatus,
        quantity: order.quantity,
      };
    });

    res.json({ orders: mappedOrders });
  } catch (err) {
    console.error('[getMyOrders] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// POST /api/orders/:id/mock-pay (UNTUK TESTING)
// TAMBAHAN: handle ITEM_GAME — set adminStatus, skip RobuxShip
// Logika lama untuk ROBUX dipertahankan persis
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

    // 2. Check jika sudah PAID (prevent duplicate calls)
    if (order.paymentStatus === 'PAID') {
      res.status(400).json({
        error: 'Order ini sudah dibayar sebelumnya.',
        orderId: order.id,
        robuxshipStatus: order.robuxshipStatus,
      });
      return;
    }

    const isItemGame = order.orderType === 'ITEM_GAME';

    // 3. Ubah status ke PAID
    // BARU: untuk ITEM_GAME juga set adminStatus PENDING_ADMIN
    await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        ...(isItemGame && { adminStatus: 'PENDING_ADMIN' }),
      },
    });

    // 4. Proses sesuai orderType
    if (isItemGame) {
      // BARU: Item Game — tidak perlu RobuxShip, admin handle manual
      await prisma.systemLog.create({
        data: {
          orderId: id,
          serviceName: 'MOCK_PAYMENT',
          eventType: 'PAYMENT_SUCCESS',
          payloadData: {
            message: 'Mock payment successful, item order awaiting admin scheduling',
            orderType: 'ITEM_GAME',
          },
          status: 'SUCCESS',
        },
      });

      res.status(200).json({
        success: true,
        message: 'Pembayaran berhasil! Order item menunggu penjadwalan admin.',
        orderId: order.id,
        adminStatus: 'PENDING_ADMIN',
      });

    } else {
      // LAMA: ROBUX — panggil RobuxShip seperti sebelumnya
      try {
        await createRobuxshipOrder(id);

        // Log sukses — sama persis dengan versi lama
        await prisma.systemLog.create({
          data: {
            orderId: id,
            serviceName: 'MOCK_PAYMENT',
            eventType: 'PAYMENT_SUCCESS',
            payloadData: {
              message: 'Mock payment successful, RobuxShip order created',
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
        // Error handling lama dipertahankan persis
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
          orderId: order.id,
        });
      }
    }
  } catch (err: any) {
    console.error('[mockPayOrder] Unexpected error:', err.message);
    res.status(500).json({
      error: 'Gagal melakukan simulasi pembayaran.',
      details: err.message,
    });
  }
};