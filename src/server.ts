import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load env vars first
dotenv.config();

// Validate required environment variables
import { validateEnvironmentVariables } from './utils/validateEnv';
validateEnvironmentVariables();

// Import Routes
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import webhookRoutes from './routes/webhookRoutes';

const PORT: number = parseInt(process.env.PORT || '5001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// ── Health check ────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'El TopUp API' });
});

// ── Routes ───────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);

// ── Start (only when running locally, not on Vercel) ─────────────────
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`⚡️  El TopUp API running at http://localhost:${PORT}`);
  });
}

export default app;