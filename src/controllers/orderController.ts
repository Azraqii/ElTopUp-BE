import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../lib/prisma';
import { syncUserToDatabase } from '../utils/syncUser';
import { validateGamepassForOrder, findGamepassByPrice } from '../services/gamepassValidationService';
import { createSnapTransaction, getTransactionStatus } from '../services/midtransService';
import { getBotRobuxBalance, purchaseGamepass } from '../services/robloxBotService';

const RATE_IDR_PER_ROBUX = 107;

// ------------------------------------------------------------------
// POST /api/orders/scan-gamepass  — Preview scan gamepass tanpa buat order
// ------------------------------------------------------------------
export const scanGamepass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { robloxUsername, robuxAmount } = req.body as {
      robloxUsername: string;
      robuxAmount: number;
    };

    if (!robloxUsername || !robuxAmount || robuxAmount < 50) {
      res.status(400).json({ error: 'Username dan nominal Robux (minimal 50) wajib diisi.' });
      return;
    }

    const grossRobuxAmount = Math.ceil(robuxAmount / 0.7);

    const scanResult = await findGamepassByPrice(robloxUsername, grossRobuxAmount);

    res.json({
      found: scanResult.found,
      gamepass: scanResult.gamepass || null,
      scannedGames: scanResult.scannedGames,
      scannedGamepasses: scanResult.scannedGamepasses,
      userId: scanResult.userId,
      username: scanResult.username,
      requiredPrice: scanResult.requiredPrice,
      grossRobuxAmount,
      netRobuxAmount: robuxAmount,
      hint: scanResult.hint || null,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: errorMessage });
  }
};

// ------------------------------------------------------------------
// POST /api/orders/checkout  — Order ROBUX
// ------------------------------------------------------------------
export const checkout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supabaseUser = req.user;
    const user = await syncUserToDatabase(supabaseUser);

    const { robloxUsername, robuxAmount } = req.body as {
      robloxUsername: string;
      robuxAmount: number;
    };

    if (!robloxUsername || !robuxAmount || robuxAmount < 50) {
      res.status(400).json({ error: 'Username dan nominal Robux (minimal 50) wajib diisi.' });
      return;
    }

    const grossRobuxAmount = Math.ceil(robuxAmount / 0.7);
    const totalPriceIdr = Math.ceil(robuxAmount * RATE_IDR_PER_ROBUX);

    let gamepassData;
    try {
      gamepassData = await validateGamepassForOrder(robloxUsername, grossRobuxAmount);
    } catch (validationError: unknown) {
      const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
      await prisma.systemLog.create({
        data: {
          serviceName: 'BOT',
          eventType: 'VALIDATE_GAMEPASS_FAILED',
          payloadData: {
            username: robloxUsername,
            requestedNet: robuxAmount,
            requiredGross: grossRobuxAmount,
            error: errorMessage,
          },
          status: 'ERROR',
        },
      });
      res.status(400).json({
        error: errorMessage,
        requiredGrossPrice: grossRobuxAmount,
      });
      return;
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        robuxAmount: robuxAmount,
        robloxUsername,
        robloxGamepassId: gamepassData.gamepassId,
        paymentStatus: 'UNPAID',
        botStatus: 'PENDING',
        customerPriceIdr: totalPriceIdr,
        orderType: 'ROBUX',
      },
    });

    await prisma.systemLog.create({
      data: {
        orderId: order.id,
        serviceName: 'BOT',
        eventType: 'VALIDATE_GAMEPASS_SUCCESS',
        payloadData: {
          gamepassId: gamepassData.gamepassId,
          gamepassName: gamepassData.gamepassName,
          username: robloxUsername,
          netRobux: robuxAmount,
          grossRobux: grossRobuxAmount,
          priceIdr: totalPriceIdr,
        },
        status: 'SUCCESS',
      },
    });

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
          payloadData: { midtransOrderId, redirectUrl: snapTransaction.redirectUrl },
          status: 'SUCCESS',
        },
      });
    } catch (midtransError: unknown) {
      const errorMessage = midtransError instanceof Error ? midtransError.message : String(midtransError);
      await prisma.systemLog.create({
        data: {
          orderId: order.id,
          serviceName: 'MIDTRANS',
          eventType: 'CREATE_SNAP_FAILED',
          payloadData: { message: errorMessage },
          status: 'ERROR',
        },
      });

      res.status(502).json({
        error: 'Order berhasil dibuat, tetapi gagal membuat transaksi pembayaran Midtrans.',
        details: errorMessage,
        orderId: order.id,
      });
      return;
    }

    res.status(201).json({
      success: true,
      orderId: order.id,
      netRobuxAmount: robuxAmount,
      grossRobuxAmount,
      totalPriceIdr,
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
// POST /api/orders/checkout-item  — Order ITEM_GAME
// ------------------------------------------------------------------
export const checkoutItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supabaseUser = req.user;
    const user = await syncUserToDatabase(supabaseUser);

    const { productId, quantity, robloxUsername, customerWhatsapp } = req.body as {
      productId: string;
      quantity: number;
      robloxUsername: string;
      customerWhatsapp: string;
    };

    if (!productId || !robloxUsername || !customerWhatsapp) {
      res.status(400).json({ error: 'Product ID, username Roblox, dan nomor WhatsApp wajib diisi.' });
      return;
    }

    const qty = quantity || 1;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { game: true },
    });

    if (!product || !product.isActive) {
      res.status(404).json({ error: 'Produk tidak ditemukan atau tidak aktif.' });
      return;
    }

    if (qty < product.minQty || qty > product.maxQty) {
      res.status(400).json({
        error: `Jumlah pembelian harus antara ${product.minQty} dan ${product.maxQty}.`,
      });
      return;
    }

    if (product.stockEnabled && product.stockQty < qty) {
      res.status(400).json({ error: 'Stok produk tidak mencukupi.' });
      return;
    }

    const totalPriceIdr = product.priceIdr * qty;

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        productId: product.id,
        robloxUsername,
        customerPriceIdr: totalPriceIdr,
        orderType: 'ITEM_GAME',
        quantity: qty,
        customerWhatsapp,
        paymentStatus: 'UNPAID',
        botStatus: 'PENDING',
      },
    });

    if (product.stockEnabled) {
      await prisma.product.update({
        where: { id: productId },
        data: { stockQty: { decrement: qty } },
      });
    }

    const frontendBaseUrl = (process.env.FRONTEND_URL || 'https://eltopup.id').replace(/\/$/, '');
    const midtransOrderId = order.id;

    let snapTransaction: { token: string; redirectUrl: string };
    try {
      snapTransaction = await createSnapTransaction({
        midtransOrderId,
        grossAmountIdr: totalPriceIdr,
        customerName: user.name || user.email || 'El Top Up Customer',
        customerEmail: user.email || `${user.id}@eltopup.id`,
        description: `${product.name} x${qty} @${robloxUsername}`,
        callbacks: {
          finish: `${frontendBaseUrl}/pesanan/${order.id}`,
          pending: `${frontendBaseUrl}/pesanan/${order.id}`,
          error: `${frontendBaseUrl}/checkout/item`,
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { midtransOrderId },
      });
    } catch (midtransError: unknown) {
      const errorMessage = midtransError instanceof Error ? midtransError.message : String(midtransError);
      await prisma.systemLog.create({
        data: {
          orderId: order.id,
          serviceName: 'MIDTRANS',
          eventType: 'CREATE_SNAP_FAILED',
          payloadData: { message: errorMessage },
          status: 'ERROR',
        },
      });

      res.status(502).json({
        error: 'Order berhasil dibuat, tetapi gagal membuat transaksi pembayaran.',
        details: errorMessage,
        orderId: order.id,
      });
      return;
    }

    res.status(201).json({
      success: true,
      orderId: order.id,
      totalPriceIdr,
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
    console.error('[checkoutItem] Unexpected error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal server saat checkout item.' });
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
      include: {
        product: { include: { game: true } },
        meetupSlot: true,
        adminNotes: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }

    if (order.userId !== supabaseUser.sub) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    res.json({
      orderId: order.id,
      orderType: order.orderType,
      paymentStatus: order.paymentStatus,
      botStatus: order.botStatus,
      botErrorMessage: order.botErrorMessage,
      adminStatus: order.adminStatus,
      robuxAmount: order.robuxAmount,
      customerPriceIdr: order.customerPriceIdr,
      robloxUsername: order.robloxUsername,
      quantity: order.quantity,
      product: order.product,
      meetupSlot: order.meetupSlot,
      meetupScheduledAt: order.meetupScheduledAt,
      meetupWorld: order.meetupWorld,
      meetupServerCode: order.meetupServerCode,
      adminNote: order.adminNote,
      adminNotes: order.adminNotes,
      cancelReason: order.cancelReason,
      cancelRequestedAt: order.cancelRequestedAt,
      refundStatus: order.refundStatus,
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
        product: { include: { game: true } },
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

      let uiStatus = 'On Progress';

      if (order.orderType === 'ROBUX') {
        if (order.paymentStatus === 'PAID' && order.botStatus === 'COMPLETED') {
          uiStatus = 'Completed';
        } else if (order.paymentStatus === 'CANCELLED') {
          uiStatus = 'Cancelled';
        } else if (
          order.paymentStatus === 'FAILED' ||
          order.paymentStatus === 'EXPIRED' ||
          order.botStatus === 'FAILED' ||
          order.botStatus === 'ERROR'
        ) {
          uiStatus = 'Failed';
        }
      } else if (order.orderType === 'ITEM_GAME') {
        if (order.adminStatus === 'DELIVERED') {
          uiStatus = 'Completed';
        } else if (order.paymentStatus === 'CANCELLED' || order.adminStatus === 'CANCELLED') {
          uiStatus = 'Cancelled';
        } else if (order.paymentStatus === 'FAILED' || order.paymentStatus === 'EXPIRED') {
          uiStatus = 'Failed';
        } else if (order.adminStatus === 'CANCEL_REQUESTED') {
          uiStatus = 'On Progress';
        }
      }

      return {
        id: order.id,
        orderNumber: order.midtransOrderId || order.id.substring(0, 8).toUpperCase(),
        orderType: order.orderType,
        formattedDate,
        priceIdr: order.customerPriceIdr,
        targetUsername: order.robloxUsername,
        itemName: order.product?.name || `${order.robuxAmount} Robux`,
        gameName: order.product?.game?.name || 'Roblox',
        gameImage: order.product?.game?.imageUrl || order.product?.imageUrl || '/default-game.png',
        amount: order.robuxAmount ? `${order.robuxAmount} Robux` : `${order.quantity}x`,
        uiStatus,
        paymentStatus: order.paymentStatus,
        botStatus: order.botStatus,
        adminStatus: order.adminStatus,
      };
    });

    res.json({ orders: mappedOrders });
  } catch (err) {
    console.error('[getMyOrders] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// POST /api/orders/:id/cancel
// ------------------------------------------------------------------
export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supabaseUser = req.user;
    const { cancelReason } = req.body as { cancelReason?: string };

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }

    if (order.userId !== supabaseUser.sub) {
      res.status(403).json({ error: 'Anda tidak memiliki akses ke order ini.' });
      return;
    }

    if (order.paymentStatus === 'UNPAID') {
      await prisma.order.update({
        where: { id },
        data: {
          paymentStatus: 'CANCELLED',
          cancelReason: cancelReason || null,
          cancelledAt: new Date(),
        },
      });
      res.json({ success: true, message: 'Order berhasil dibatalkan.' });
      return;
    }

    if (order.orderType === 'ROBUX') {
      res.status(400).json({ error: 'Order Robux yang sudah dibayar tidak dapat dibatalkan.' });
      return;
    }

    if (order.orderType === 'ITEM_GAME' && order.paymentStatus === 'PAID') {
      if (order.adminStatus === 'DELIVERED' || order.adminStatus === 'CANCELLED') {
        res.status(400).json({ error: 'Order ini sudah selesai dan tidak dapat dibatalkan.' });
        return;
      }

      if (order.adminStatus === 'CANCEL_REQUESTED') {
        res.status(400).json({ error: 'Permintaan pembatalan sudah diajukan sebelumnya.' });
        return;
      }

      await prisma.order.update({
        where: { id },
        data: {
          previousAdminStatus: order.adminStatus,
          adminStatus: 'CANCEL_REQUESTED',
          cancelReason: cancelReason || null,
          cancelRequestedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Permintaan pembatalan berhasil diajukan. Menunggu persetujuan admin.',
      });
      return;
    }

    res.status(400).json({ error: 'Order tidak dapat dibatalkan dengan status saat ini.' });
  } catch (err) {
    console.error('[cancelOrder] Unexpected error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal saat membatalkan order.' });
  }
};

// ------------------------------------------------------------------
// GET /api/orders/check-stock?amount=XXX  — Cek ketersediaan stok Robux bot
// ------------------------------------------------------------------
export const checkStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const amount = parseInt(req.query.amount as string);

    if (!amount || amount < 50 || amount > 100000) {
      res.status(400).json({ error: 'Jumlah Robux harus antara 50 dan 100.000.' });
      return;
    }

    const requiredRobux = Math.ceil(amount / 0.7);
    const botBalance = await getBotRobuxBalance();
    const available = botBalance >= requiredRobux;

    res.json({
      available,
      requiredRobux,
      message: available
        ? 'Stok mencukupi.'
        : 'Stok Robux saat ini tidak mencukupi. Silakan kurangi jumlah atau hubungi admin.',
    });
  } catch (err) {
    console.error('[checkStock] Error:', err);
    res.status(500).json({ error: 'Gagal mengecek ketersediaan stok.' });
  }
};

// ------------------------------------------------------------------
// POST /api/orders/:id/verify-payment  — Verifikasi langsung ke Midtrans API
// ------------------------------------------------------------------
export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.sub as string;

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }

    if (order.userId !== userId) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    if (order.paymentStatus === 'PAID') {
      res.json({ status: 'already_paid', paymentStatus: 'PAID' });
      return;
    }

    if (order.paymentStatus !== 'UNPAID') {
      res.json({ status: 'no_action', paymentStatus: order.paymentStatus });
      return;
    }

    const midtransOrderId = order.midtransOrderId || order.id;
    const txStatus = await getTransactionStatus(midtransOrderId);

    console.log(`[verifyPayment] Order ${id}: transaction_status=${txStatus.transaction_status}, fraud=${txStatus.fraud_status}`);

    if (
      (txStatus.transaction_status === 'settlement' || txStatus.transaction_status === 'capture') &&
      txStatus.fraud_status !== 'challenge'
    ) {
      await prisma.order.update({
        where: { id },
        data: { paymentStatus: 'PAID' },
      });

      await prisma.systemLog.create({
        data: {
          orderId: id,
          serviceName: 'MIDTRANS',
          eventType: 'PAYMENT_VERIFIED',
          payloadData: { source: 'verify-payment', transactionStatus: txStatus.transaction_status },
          status: 'SUCCESS',
        },
      });

      console.log(`[verifyPayment] Order ${id} → PAID`);

      if (order.orderType === 'ROBUX') {
        processBotPurchaseAfterPayment(id).catch((err) => {
          console.error(`[verifyPayment] Background bot purchase error for ${id}:`, err);
        });
      } else if (order.orderType === 'ITEM_GAME') {
        await prisma.order.update({
          where: { id },
          data: { adminStatus: 'PENDING_ADMIN' },
        });
        console.log(`[verifyPayment] Order ITEM_GAME ${id} → PENDING_ADMIN`);
      }

      res.json({ status: 'paid', paymentStatus: 'PAID' });
    } else if (txStatus.transaction_status === 'pending') {
      res.json({ status: 'pending', paymentStatus: 'UNPAID' });
    } else {
      res.json({ status: 'not_paid', transactionStatus: txStatus.transaction_status });
    }
  } catch (err) {
    console.error('[verifyPayment] Error:', err);
    res.status(500).json({ error: 'Gagal memverifikasi pembayaran.' });
  }
};

async function processBotPurchaseAfterPayment(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

  if (!order.robloxGamepassId || order.robuxAmount === null) {
    throw new Error(`Order ${orderId} tidak memiliki gamepassId atau robuxAmount.`);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { botStatus: 'PROCESSING' },
  });

  try {
    const grossAmount = Math.ceil(order.robuxAmount / 0.7);
    const result = await purchaseGamepass(order.robloxGamepassId, grossAmount);

    if (result.success) {
      await prisma.order.update({
        where: { id: orderId },
        data: { botStatus: 'COMPLETED' },
      });
      console.log(`[verifyPayment] Bot purchase berhasil untuk order ${orderId}`);
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          botStatus: 'FAILED',
          botErrorMessage: result.message || 'Pembelian gagal.',
        },
      });
      console.error(`[verifyPayment] Bot purchase gagal untuk order ${orderId}: ${result.message}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.order.update({
      where: { id: orderId },
      data: {
        botStatus: 'FAILED',
        botErrorMessage: errorMessage,
      },
    });
    console.error(`[verifyPayment] Bot purchase error order ${orderId}:`, errorMessage);
  }
}
