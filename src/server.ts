import './env';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import passport from 'passport';
import path from 'path';
import { ensureBotCookieConfig } from './services/robloxBotService';

const PORT: number = parseInt(process.env.PORT || '5001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(passport.initialize());

app.use('/admin-ui', express.static(path.join(__dirname, '../admin-ui')));

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'El TopUp API' });
});

app.use('/api/auth', async (req, res, next) => {
  try {
    const { default: authRoutes } = await import('./routes/authRoutes');
    authRoutes(req, res, next);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'AUTH_ROUTE_CRASH', message });
  }
});

app.use('/api/auth', async (req, res, next) => {
  try {
    const { default: userAuthRoutes } = await import('./routes/userAuthRoutes');
    userAuthRoutes(req, res, next);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'USER_AUTH_ROUTE_CRASH', message });
  }
});

app.use('/api/orders', async (req, res, next) => {
  try {
    const { default: orderRoutes } = await import('./routes/orderRoutes');
    orderRoutes(req, res, next);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'ORDER_ROUTE_CRASH', message });
  }
});

app.use('/api/roblox', async (req, res, next) => {
  try {
    const { default: robloxRoutes } = await import('./routes/robloxRoutes');
    robloxRoutes(req, res, next);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'ROBLOX_ROUTE_CRASH', message });
  }
});

app.use('/api/webhooks', async (req, res, next) => {
  try {
    const { default: webhookRoutes } = await import('./routes/webhookRoutes');
    webhookRoutes(req, res, next);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'WEBHOOK_ROUTE_CRASH', message });
  }
});

app.use('/api/admin/auth', async (req, res, next) => {
  try {
    const { default: adminAuthRoutes } = await import('./routes/adminAuthRoutes');
    adminAuthRoutes(req, res, next);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'ADMIN_AUTH_ROUTE_CRASH', message });
  }
});

app.use('/api/admin', async (req, res, next) => {
  try {
    const { default: adminRoutes } = await import('./routes/adminRoutes');
    adminRoutes(req, res, next);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'ADMIN_ROUTE_CRASH', message });
  }
});

ensureBotCookieConfig().catch((err) => {
  console.error('[startup] Gagal inisialisasi bot cookie config:', err);
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`⚡️  El TopUp API running at http://localhost:${PORT}`);
  });
}

export default app;
