import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { purchaseGamepass } from '../services/robloxBotService';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY as string;
const MIDTRANS_IS_PRODUCTION = String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true';

async function processBotPurchase(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

  if (!order.robloxGamepassId || order.robuxAmount === null) {
    throw new Error(`Order ${orderId} tidak memiliki gamepassId atau robuxAmount.`);
  }

  console.log(`🤖 BOT: Memulai pembelian gamepass ${order.robloxGamepassId} untuk order ${orderId}...`);

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

      await prisma.systemLog.create({
        data: {
          orderId,
          serviceName: 'BOT',
          eventType: 'PURCHASE_SUCCESS',
          payloadData: { gamepassId: order.robloxGamepassId, ...JSON.parse(JSON.stringify(result)) },
          status: 'SUCCESS',
        },
      });

      console.log(`✅ BOT: Pembelian berhasil untuk order ${orderId}`);
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          botStatus: 'FAILED',
          botErrorMessage: result.message || 'Pembelian gagal tanpa pesan error.',
        },
      });

      await prisma.systemLog.create({
        data: {
          orderId,
          serviceName: 'BOT',
          eventType: 'PURCHASE_FAILED',
          payloadData: { gamepassId: order.robloxGamepassId, ...JSON.parse(JSON.stringify(result)) },
          status: 'ERROR',
        },
      });

      console.error(`❌ BOT: Pembelian gagal untuk order ${orderId}: ${result.message}`);
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

    await prisma.systemLog.create({
      data: {
        orderId,
        serviceName: 'BOT',
        eventType: 'PURCHASE_ERROR',
        payloadData: { gamepassId: order.robloxGamepassId, error: errorMessage },
        status: 'ERROR',
      },
    });

    console.error(`❌ BOT: Error saat pembelian order ${orderId}:`, errorMessage);
  }
}

// ------------------------------------------------------------------
// POST /api/webhooks/midtrans
// ------------------------------------------------------------------
export const midtransWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    if (MIDTRANS_IS_PRODUCTION) {
      const hashSignature = crypto
        .createHash('sha512')
        .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${MIDTRANS_SERVER_KEY}`)
        .digest('hex');

      if (hashSignature !== payload.signature_key) {
        console.warn('[Webhook Midtrans] Invalid signature key — request ditolak.');
        res.status(401).json({ error: 'Invalid signature key' });
        return;
      }
    } else {
      if (payload.signature_key) {
        const hashSignature = crypto
          .createHash('sha512')
          .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${MIDTRANS_SERVER_KEY}`)
          .digest('hex');

        if (hashSignature !== payload.signature_key) {
          console.warn('[Webhook Midtrans] Sandbox: signature tidak cocok, tapi tetap diproses.');
        }
      } else {
        console.log('[Webhook Midtrans] Sandbox: test notification tanpa signature.');
      }
    }

    const externalOrderId = String(payload.order_id || '');
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    if (!externalOrderId) {
      res.status(400).json({ error: 'Invalid order_id from Midtrans payload' });
      return;
    }

    console.log(`[Webhook Midtrans] Received: order=${externalOrderId} status=${transactionStatus}`);

    const order = await prisma.order.findUnique({
      where: { midtransOrderId: externalOrderId },
    });

    if (!order) {
      console.warn(`[Webhook Midtrans] Order tidak ditemukan: ${externalOrderId} — mungkin test notification dari Midtrans.`);
      res.status(200).json({ status: 'order not found, ignored' });
      return;
    }

    const orderId = order.id;

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'challenge') {
        console.warn(`[Webhook Midtrans] Order ${orderId} flagged as challenge — skip.`);
        res.status(200).json({ status: 'challenge ignored' });
        return;
      }

      if (order.paymentStatus !== 'UNPAID' && order.paymentStatus !== 'FAILED') {
        console.log(`[Webhook Midtrans] Order ${orderId} sudah berstatus ${order.paymentStatus}, skip.`);
        res.status(200).json({ status: 'already processed' });
        return;
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PAID' },
      });

      console.log(`[Webhook Midtrans] Order ${orderId} → PAID`);

      await prisma.systemLog.create({
        data: {
          orderId,
          serviceName: 'MIDTRANS',
          eventType: 'PAYMENT_SETTLED',
          payloadData: { transactionStatus, externalOrderId },
          status: 'SUCCESS',
        },
      });

      if (order.orderType === 'ROBUX') {
        processBotPurchase(orderId).catch((err) => {
          console.error(`[Webhook Midtrans] Background bot purchase error for ${orderId}:`, err);
        });
      } else if (order.orderType === 'ITEM_GAME') {
        await prisma.order.update({
          where: { id: orderId },
          data: { adminStatus: 'PENDING_ADMIN' },
        });

        await prisma.systemLog.create({
          data: {
            orderId,
            serviceName: 'SYSTEM',
            eventType: 'ITEM_ORDER_PENDING_ADMIN',
            payloadData: { orderType: 'ITEM_GAME' },
            status: 'SUCCESS',
          },
        });

        console.log(`[Webhook Midtrans] Order ITEM_GAME ${orderId} → PENDING_ADMIN`);
      }
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      const failedStatus =
        transactionStatus === 'cancel' ? 'CANCELLED' :
        transactionStatus === 'expire' ? 'EXPIRED' : 'FAILED';

      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: failedStatus },
      });

      console.log(`[Webhook Midtrans] Order ${orderId} → ${failedStatus}`);
    } else if (transactionStatus === 'pending') {
      console.log(`[Webhook Midtrans] Order ${orderId} masih pending, tidak ada aksi.`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Midtrans Webhook Error]:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
