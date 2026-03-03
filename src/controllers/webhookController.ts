import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { verifyMidtransNotification } from '../services/midtransService';
import { createRobuxshipOrder } from '../services/robuxshipService';

// ------------------------------------------------------------------
// POST /api/webhooks/midtrans
// ------------------------------------------------------------------
// Phase 2 & 3: Confirm payment → trigger RobuxShip order

export const handleMidtransWebhook = async (req: Request, res: Response): Promise<void> => {
  const rawBody = req.body as Record<string, unknown>;

  // Always respond 200 quickly so Midtrans doesn't retry unnecessarily.
  // We do all real work after the response is acknowledged.

  let orderId: string | undefined;

  try {
    // 1. Verify the notification with Midtrans SDK (checks signature hash)
    const notification = await verifyMidtransNotification(rawBody as Record<string, string>);

    const transactionStatus: string = notification.transaction_status;
    const fraudStatus: string = notification.fraud_status;

    // The order_id we sent to Midtrans is our internal Order.id (UUID)
    orderId = notification.order_id as string;

    // Log every incoming webhook for audit purposes
    await prisma.systemLog.create({
      data: {
        orderId,
        serviceName: 'MIDTRANS',
        eventType: 'WEBHOOK_RECEIVED',
        payloadData: notification as object,
        status: 'INFO',
      },
    });

    // Fetch the order to verify it exists and current status
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      console.error(`[webhook] Order not found: ${orderId}`);
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    // Idempotency: if already PAID, skip to avoid double-processing
    if (order.paymentStatus === 'PAID') {
      res.status(200).json({ message: 'Already processed.' });
      return;
    }

    // 2. Determine the final payment status
    let newPaymentStatus: string | null = null;

    if (transactionStatus === 'capture') {
      newPaymentStatus = fraudStatus === 'accept' ? 'PAID' : 'FAILED';
    } else if (transactionStatus === 'settlement') {
      newPaymentStatus = 'PAID';
    } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
      newPaymentStatus = 'FAILED';
    }

    if (!newPaymentStatus) {
      // Pending or unhandled state — just acknowledge
      res.status(200).json({ message: 'Status noted, no action taken.' });
      return;
    }

    // 3. Update payment status in DB
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: newPaymentStatus },
    });

    await prisma.systemLog.create({
      data: {
        orderId,
        serviceName: 'MIDTRANS',
        eventType: 'PAYMENT_STATUS_UPDATED',
        payloadData: { transactionStatus, fraudStatus, newPaymentStatus } as object,
        status: 'SUCCESS',
      },
    });

    res.status(200).json({ message: 'Webhook processed.' });

    // 4. If PAID, trigger RobuxShip order fulfillment (async — after response sent)
    if (newPaymentStatus === 'PAID') {
      // Fire-and-forget with its own error handling to protect against API downtime
      setImmediate(async () => {
        try {
          await createRobuxshipOrder(orderId as string);
          console.log(`[webhook] RobuxShip order created for order ${orderId}`);
        } catch (robuxShipError) {
          // createRobuxshipOrder already logs the error and marks the order ERROR.
          // The order remains in paymentStatus=PAID so it can be retried manually/automatically.
          console.error(
            `[webhook] RobuxShip fulfillment failed for order ${orderId}:`,
            (robuxShipError as Error).message,
          );
        }
      });
    }
  } catch (err) {
    console.error('[webhook] Fatal error processing Midtrans webhook:', err);

    // Log the failure if we have an orderId
    if (orderId) {
      await prisma.systemLog
        .create({
          data: {
            orderId,
            serviceName: 'MIDTRANS',
            eventType: 'WEBHOOK_PROCESSING_ERROR',
            payloadData: { error: (err as Error).message, raw: rawBody } as object,
            status: 'ERROR',
          },
        })
        .catch(() => {
          /* swallow secondary error */
        });
    }

    res.status(500).json({ error: 'Internal error processing webhook.' });
  }
};
