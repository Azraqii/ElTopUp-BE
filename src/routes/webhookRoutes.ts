import { Router } from 'express';
import { midtransWebhook } from '../controllers/webhookController';

const router = Router();

router.get('/midtrans', (_req, res) => res.status(200).json({ status: 'ok' }));
router.post('/midtrans', midtransWebhook);

export default router;
