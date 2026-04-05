// src/controllers/webhookController.ts
// MILESTONE 2 — ADDITIVE UPDATE
// Semua logika lama dipertahankan persis.
// Yang ditambahkan:
//   - midtransWebhook: cek orderType sebelum RobuxShip
//     ITEM_GAME → set adminStatus PENDING_ADMIN, skip RobuxShip
//     ROBUX     → flow lama persis (ROBUXSHIP_AUTO_FULFILLMENT, dll)
//   - robuxshipWebhook: tambah guard skip jika bukan ROBUX

import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { createRobuxshipOrder } from '../services/robuxshipService';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY as string;
const MIDTRANS_IS_PRODUCTION = String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true';

// Logika ROBUXSHIP_AUTO_FULFILLMENT lama — dipertahankan persis
const ROBUXSHIP_AUTO_FULFILLMENT = (() => {
  const override = process.env.ROBUXSHIP_AUTO_FULFILLMENT;
  if (override === undefined || override === '') {
    return MIDTRANS_IS_PRODUCTION;
  }
  return String(override).toLowerCase() === 'true';
})();

// ------------------------------------------------------------------
// POST /api/webhooks/midtrans
// ------------------------------------------------------------------
export const midtransWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    // 1. Validasi Signature Key
    // Logika lama dipertahankan persis — sandbox skip, production wajib
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
      // Sandbox: tetap validasi kalau signature_key ada di payload
      if (payload.signature_key) {
        const hashSignature = crypto
          .createHash('sha512')
          .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${MIDTRANS_SERVER_KEY}`)
          .digest('hex');

        if (hashSignature !== payload.signature_key) {
          console.warn('[Webhook Midtrans] Sandbox: signature tidak cocok, tapi tetap diproses untuk debugging.');
        }
      } else {
        console.log('[Webhook Midtrans] Sandbox: test notification tanpa signature, dilewati.');
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

    // 2. Ambil data order dari database — sama persis dengan lama
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ midtransOrderId: externalOrderId }, { id: externalOrderId }],
      },
    });

    if (!order) {
      console.warn(`[Webhook Midtrans] Order tidak ditemukan: ${externalOrderId}`);
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const orderId = order.id;

    // 3. Proses berdasarkan status pembayaran
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'challenge') {
        console.warn(`[Webhook Midtrans] Order ${orderId} flagged as challenge — skip.`);
        res.status(200).json({ status: 'challenge ignored' });
        return;
      }

      if (order.paymentStatus === 'UNPAID' || order.paymentStatus === 'FAILED') {

        // ── PATCH MILESTONE 2 ─────────────────────────────────────
        // Tentukan tindakan berdasarkan orderType.
        // ROBUX     → flow lama persis (ROBUXSHIP_AUTO_FULFILLMENT)
        // ITEM_GAME → set adminStatus PENDING_ADMIN, skip RobuxShip
        // ──────────────────────────────────────────────────────────

        const isItemGame = order.orderType === 'ITEM_GAME';

        if (isItemGame) {
          // BARU: Item Game — update PAID + adminStatus sekaligus
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'PAID',
              adminStatus: 'PENDING_ADMIN',
            },
          });

          console.log(`[Webhook Midtrans] Order ${orderId} → PAID | ITEM_GAME → adminStatus: PENDING_ADMIN`);

          await prisma.systemLog.create({
            data: {
              orderId,
              serviceName: 'ITEM_GAME',
              eventType: 'PAYMENT_RECEIVED_PENDING_ADMIN',
              payloadData: {
                midtransOrderId: externalOrderId,
                transactionStatus,
                productId: order.productId,
                quantity: order.quantity,
                robloxUsername: order.robloxUsername,
              },
              status: 'INFO',
            },
          });

        } else {
          // LAMA: ROBUX — semua logika lama dipertahankan persis
          await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'PAID' },
          });

          console.log(`[Webhook Midtrans] Order ${orderId} → PAID`);

          if (!ROBUXSHIP_AUTO_FULFILLMENT) {
            await prisma.systemLog.create({
              data: {
                orderId,
                serviceName: 'ROBUXSHIP',
                eventType: 'AUTO_FULFILLMENT_SKIPPED',
                payloadData: {
                  reason: MIDTRANS_IS_PRODUCTION ? 'disabled_by_env' : 'midtrans_sandbox_mode',
                  midtransOrderId: externalOrderId,
                  transactionStatus,
                },
                status: 'INFO',
              },
            });
            console.log(`[Webhook Midtrans] Auto-fulfillment dilewati untuk Order ${orderId}`);
          } else {
            try {
              await createRobuxshipOrder(orderId);
              console.log(`[Webhook Midtrans] RobuxShip order created untuk Order ${orderId}`);
            } catch (err: any) {
              console.error(`[Webhook Midtrans] Gagal tembak RobuxShip untuk Order ${orderId}:`, err.message);
            }
          }
        }

      } else {
        // Lama: skip jika sudah PAID
        console.log(`[Webhook Midtrans] Order ${orderId} sudah berstatus ${order.paymentStatus}, skip.`);
      }

    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      // Lama: dipertahankan persis
      const failedStatus =
        transactionStatus === 'cancel' ? 'CANCELLED' :
        transactionStatus === 'expire' ? 'EXPIRED' : 'FAILED';

      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: failedStatus },
      });

      console.log(`[Webhook Midtrans] Order ${orderId} → ${failedStatus}`);

    } else if (transactionStatus === 'pending') {
      // Lama: dipertahankan persis
      console.log(`[Webhook Midtrans] Order ${orderId} masih pending, tidak ada aksi.`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Midtrans Webhook Error]:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ------------------------------------------------------------------
// POST /api/webhooks/robuxship
// TAMBAHAN: guard skip jika order bukan ROBUX
// Semua logika lama untuk ROBUX dipertahankan persis
// ------------------------------------------------------------------
export const robuxshipWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = req.headers['robuxship-event'];
    const payload = req.body;

    if (!event || !payload.data) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const orderId = payload.data.external_order_id;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // BARU: guard — RobuxShip webhook hanya relevan untuk ROBUX
    // Kalau entah bagaimana RobuxShip mengirim webhook untuk non-ROBUX, skip saja
    if (order.orderType !== 'ROBUX') {
      console.warn(`[Webhook RobuxShip] Order ${orderId} bukan ROBUX (${order.orderType}), skip.`);
      res.status(200).json({ status: 'ignored - not a robux order' });
      return;
    }

    console.log(`[Webhook RobuxShip] Event: ${event} | Order: ${orderId}`);

    // Logika lama dipertahankan persis
    if (event === 'order.completed') {
      await prisma.order.update({
        where: { id: orderId },
        data: { robuxshipStatus: 'COMPLETED' },
      });
      console.log(`[Webhook RobuxShip] Order ${orderId} → COMPLETED`);
    } else if (event === 'order.failed') {
      await prisma.order.update({
        where: { id: orderId },
        data: { robuxshipStatus: 'FAILED' },
      });
      await prisma.systemLog.create({
        data: {
          orderId,
          serviceName: 'ROBUXSHIP',
          eventType: 'WEBHOOK_ORDER_FAILED',
          payloadData: payload,
          status: 'ERROR',
        },
      });
      console.error(`[Webhook RobuxShip] Order ${orderId} → FAILED:`, payload.data.error_message);
    } else if (event === 'order.cancelled') {
      await prisma.order.update({
        where: { id: orderId },
        data: { robuxshipStatus: 'CANCELLED' },
      });
      console.log(`[Webhook RobuxShip] Order ${orderId} → CANCELLED`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[RobuxShip Webhook Error]:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};