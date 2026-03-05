import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../lib/prisma';
import { syncUserToDatabase } from '../utils/syncUser';
import { validateGamepass, syncRobuxshipStatus } from '../services/robuxshipService';
import { createSnapTransaction } from '../services/midtransService';

// Konfigurasi Rate Harga (Bisa dipindah ke .env atau SystemConfig nanti)
const RATE_USD_PER_1K_ROBUX = 4.5;
const RATE_IDR_PER_USD = 16970;

// ------------------------------------------------------------------
// POST /api/orders/checkout
// ------------------------------------------------------------------
export const checkout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supabaseUser = req.user;
    const user = await syncUserToDatabase(supabaseUser);

    // 1. Terima input dinamis dari frontend
    const { robloxUsername, robuxAmount } = req.body as {
      robloxUsername: string;
      robuxAmount: number;
    };

    if (!robloxUsername || !robuxAmount || robuxAmount < 10) {
      res.status(400).json({ error: 'Username dan nominal Robux (minimal 10) wajib diisi.' });
      return;
    }

    // 2. Kalkulasi Harga Jual IDR secara Dinamis
    const priceUsd = (robuxAmount / 1000) * RATE_USD_PER_1K_ROBUX;
    const totalPriceIdr = Math.ceil(priceUsd * RATE_IDR_PER_USD);

    // 3. Kalkulasi Pajak 30% Roblox untuk Gamepass (Pembulatan ke Atas)
    const grossRobuxAmount = Math.ceil(robuxAmount / 0.7);

    // 4. Validate gamepass via RobuxShip menggunakan harga Gross
    let gamepassData;
    try {
      gamepassData = await validateGamepass(robloxUsername, grossRobuxAmount);
    } catch (validationError: any) {
      await prisma.systemLog.create({
        data: {
          serviceName: 'ROBUXSHIP',
          eventType: 'VALIDATE_GAMEPASS_FAILED',
          payloadData: { username: robloxUsername, requestedNett: robuxAmount, requiredGross: grossRobuxAmount, error: validationError.message },
          status: 'ERROR',
        },
      });
      res.status(400).json({
        error: 'Validasi gamepass gagal. Pastikan gamepass sudah dibuat dan harganya sesuai.',
        details: validationError.message,
        requiredPrice: grossRobuxAmount // Beritahu frontend harga gamepass yang seharusnya
      });
      return;
    }

    // 5. Create Order record (Tanpa CatalogItem)
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        robuxAmount: robuxAmount, // Simpan nominal asli inputan user
        robloxUsername,
        robloxGamepassId: gamepassData.gamepassId?.toString(),
        paymentStatus: 'UNPAID',
        robuxshipStatus: 'PENDING',
        customerPriceIdr: totalPriceIdr, // Simpan harga IDR yang sudah dihitung
        robuxshipCostUsd: gamepassData.cost, 
      },
    });

    // 6. Create Midtrans Snap transaction
    const snapResult = await createSnapTransaction({
      midtransOrderId: order.id,
      grossAmountIdr: totalPriceIdr,
      customerName: user.name || user.email,
      customerEmail: user.email,
      description: `Top Up ${robuxAmount} Robux — El TopUp`,
    });

    // 7. Save Midtrans order ID
    await prisma.order.update({
      where: { id: order.id },
      data: { midtransOrderId: order.id },
    });

    // Log success
    await prisma.systemLog.create({
      data: {
        orderId: order.id,
        serviceName: 'MIDTRANS',
        eventType: 'SNAP_TRANSACTION_CREATED',
        payloadData: { token: snapResult.token },
        status: 'SUCCESS',
      },
    });

    res.status(201).json({
      orderId: order.id,
      paymentToken: snapResult.token,
      paymentUrl: snapResult.redirectUrl,
      grossRobuxRequired: grossRobuxAmount,
      totalPriceIdr: totalPriceIdr
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
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  } catch (err) {
    console.error('[getMyOrders] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};