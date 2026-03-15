import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { createRobuxshipOrder } from '../services/robuxshipService';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY as string;

// ------------------------------------------------------------------
// POST /api/webhooks/midtrans
// ------------------------------------------------------------------
export const midtransWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    // 1. Validasi Keamanan (Signature Key)
    // Rumus Midtrans: SHA512(order_id + status_code + gross_amount + server_key)
    const hashSignature = crypto
      .createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${MIDTRANS_SERVER_KEY}`)
      .digest('hex');

    if (hashSignature !== payload.signature_key) {
      res.status(401).json({ error: 'Invalid signature key' });
      return;
    }

    const externalOrderId = String(payload.order_id || '');
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    if (!externalOrderId) {
      res.status(400).json({ error: 'Invalid order_id from Midtrans payload' });
      return;
    }

    // 2. Ambil data order dari database
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ midtransOrderId: externalOrderId }, { id: externalOrderId }],
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const orderId = order.id;

    // 3. Proses berdasarkan status pembayaran
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'challenge') {
        // Abaikan atau review manual jika Midtrans curiga ini fraud
        res.status(200).json({ status: 'challenge ignored' });
        return;
      }

      // Jika sebelumnya UNPAID, sekarang kita proses!
      if (order.paymentStatus === 'UNPAID') {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'PAID' },
        });

        // OTOMATIS TEMBAK KE ROBUXSHIP!
        // Gunakan blok try-catch agar webhook membalas 200 OK ke Midtrans walau RobuxShip error
        try {
          await createRobuxshipOrder(orderId);
        } catch (err: any) {
          console.error(`[Webhook Midtrans] Gagal menembak RobuxShip untuk Order ${orderId}:`, err.message);
        }
      }
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      const failedStatus =
        transactionStatus === 'cancel'
          ? 'CANCELLED'
          : transactionStatus === 'expire'
          ? 'EXPIRED'
          : 'FAILED';

      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: failedStatus },
      });
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Midtrans Webhook Error]:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ------------------------------------------------------------------
// POST /api/webhooks/robuxship
// ------------------------------------------------------------------
export const robuxshipWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Membaca jenis event dari Header RobuxShip
    const event = req.headers['robuxship-event'];
    const payload = req.body;

    if (!event || !payload.data) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    // Mengambil external_order_id yang kita kirim sebelumnya
    const orderId = payload.data.external_order_id; 

    // Cari order di database
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Update status berdasarkan event
    if (event === 'order.completed') {
      await prisma.order.update({
        where: { id: orderId },
        data: { robuxshipStatus: 'COMPLETED' },
      });
    } else if (event === 'order.failed') {
      await prisma.order.update({
        where: { id: orderId },
        data: { robuxshipStatus: 'FAILED' },
      });
      // Catat log error spesifik dari RobuxShip
      await prisma.systemLog.create({
        data: {
          orderId,
          serviceName: 'ROBUXSHIP',
          eventType: 'WEBHOOK_ORDER_FAILED',
          payloadData: payload,
          status: 'ERROR',
        }
      });
    } else if (event === 'order.cancelled') {
      await prisma.order.update({
        where: { id: orderId },
        data: { robuxshipStatus: 'CANCELLED' },
      });
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[RobuxShip Webhook Error]:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};