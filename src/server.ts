import express, { type Request, type Response } from 'express';
import { checkout, getOrderStatus, getMyOrders, mockPayOrder } from './controllers/orderController';
import { register, login, syncProfile, getMe } from './controllers/authController';
import { midtransWebhook, robuxshipWebhook } from './controllers/webhookController';
import { requireAuth } from './middleware/authMiddleware';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'no-webhook-routes' });
});

app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/sync', requireAuth, syncProfile);
app.get('/api/auth/me', requireAuth, getMe);

app.post('/api/orders/checkout', requireAuth, checkout);
app.get('/api/orders', requireAuth, getMyOrders);
app.get('/api/orders/:id/status', requireAuth, getOrderStatus);
app.post('/api/orders/:id/mock-pay', requireAuth, mockPayOrder);

export default app;