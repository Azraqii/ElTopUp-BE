import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const PORT: number = parseInt(process.env.PORT || '5001', 10);
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

// Lazy import routes — hanya diload saat request masuk
app.use('/api/auth', async (req, res, next) => {
  const { default: authRoutes } = await import('./routes/authRoutes');
  authRoutes(req, res, next);
});

app.use('/api/orders', async (req, res, next) => {
  const { default: orderRoutes } = await import('./routes/orderRoutes');
  orderRoutes(req, res, next);
});

app.use('/api/webhooks', async (req, res, next) => {
  const { default: webhookRoutes } = await import('./routes/webhookRoutes');
  webhookRoutes(req, res, next);
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`⚡️  El TopUp API running at http://localhost:${PORT}`);
  });
}

export default app;