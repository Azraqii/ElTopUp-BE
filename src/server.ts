import express, { type Request, type Response } from 'express';
import { checkout, getOrderStatus, getMyOrders, mockPayOrder } from './controllers/orderController';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'ordercontroller-only' });
});

export default app;