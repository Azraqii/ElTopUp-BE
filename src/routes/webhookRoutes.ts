import { Router } from 'express';
import { midtransWebhook } from '../controllers/webhookController';

const router = Router();

router.post('/midtrans', midtransWebhook);

export default router;
