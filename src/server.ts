import express, { type Request, type Response } from 'express';
import { checkout } from './controllers/orderController';
import { midtransWebhook } from './controllers/webhookController';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'both-controllers' });
});

export default app;