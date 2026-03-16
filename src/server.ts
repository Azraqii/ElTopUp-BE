import express, { type Request, type Response } from 'express';
import { midtransWebhook, robuxshipWebhook } from './controllers/webhookController';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'webhookcontroller-only' });
});

export default app;