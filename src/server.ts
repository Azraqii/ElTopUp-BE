import express, { type Request, type Response } from 'express';
import { checkout, getOrderStatus, getMyOrders, mockPayOrder } from './controllers/orderController';
import { register, login, syncProfile, getMe } from './controllers/authController';
import { midtransWebhook, robuxshipWebhook } from './controllers/webhookController';
import { requireAuth } from './middleware/authMiddleware';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'all-three-controllers' });
});

export default app;