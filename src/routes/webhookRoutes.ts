import { Router } from 'express';
import { handleMidtransWebhook } from '../controllers/webhookController';

const router = Router();

// POST /api/webhooks/midtrans — Midtrans payment notification callback
// NOTE: This endpoint must NOT require auth — Midtrans calls it server-to-server.
// Security is handled via Midtrans signature verification inside the controller.
router.post('/midtrans', handleMidtransWebhook);

export default router;
