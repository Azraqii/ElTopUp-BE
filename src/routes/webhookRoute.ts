import { Router } from 'express';
import { midtransWebhook, robuxshipWebhook } from '../controllers/webhookController';

const router = Router();

// Endpoint ini TIDAK boleh dipasang requireAuth, 
// karena yang menembak adalah server Midtrans & RobuxShip, bukan user.
router.post('/midtrans', midtransWebhook);
router.post('/robuxship', robuxshipWebhook);

export default router;