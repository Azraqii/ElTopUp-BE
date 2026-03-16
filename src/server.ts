import express, { type Request, type Response } from 'express';
import { createSnapTransaction } from './services/midtransService';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'midtrans-imported' });
});

export default app;