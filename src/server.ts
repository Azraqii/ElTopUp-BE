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

app.use('/api/auth', async (req, res, next) => {
  try {
    const { default: authRoutes } = await import('./routes/authRoutes');
    authRoutes(req, res, next);
  } catch (err: any) {
    res.status(500).json({ error: 'AUTH_ROUTE_CRASH', message: err.message, stack: err.stack });
  }
});

app.use('/api/orders', async (req, res, next) => {
  try {
    const { default: orderRoutes } = await import('./routes/orderRoutes');
    orderRoutes(req, res, next);
  } catch (err: any) {
    res.status(500).json({ error: 'ORDER_ROUTE_CRASH', message: err.message, stack: err.stack });
  }
});

app.use('/api/webhooks', async (req, res, next) => {
  try {
    const { default: webhookRoutes } = await import('./routes/webhookRoutes');
    webhookRoutes(req, res, next);
  } catch (err: any) {
    res.status(500).json({ error: 'WEBHOOK_ROUTE_CRASH', message: err.message, stack: err.stack });
  }
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`⚡️  El TopUp API running at http://localhost:${PORT}`);
  });
}

export default app;