import express, { type Request, type Response } from 'express';
import cors from 'cors';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

import { validateEnvironmentVariables } from './utils/validateEnv';
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import webhookRoutes from './routes/webhookRoutes';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'El TopUp API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);

if (process.env.VERCEL !== '1') {
  const PORT = parseInt(process.env.PORT || '5001', 10);
  app.listen(PORT, () => {
    console.log(`⚡️ El TopUp API running at http://localhost:${PORT}`);
  });
}

export default app;