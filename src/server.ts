import express, { type Request, type Response } from 'express';
import orderRoutes from './routes/orderRoutes';
import webhookRoutes from './routes/webhookRoutes';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'order-and-webhook' });
});

app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);

export default app;