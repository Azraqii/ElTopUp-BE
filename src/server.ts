import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load env vars first
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Validate required environment variables
import { validateEnvironmentVariables } from './utils/validateEnv';
let startupConfigError: Error | null = null;
try {
  validateEnvironmentVariables();
} catch (error) {
  startupConfigError = error instanceof Error ? error : new Error('Unknown environment validation error');
  console.error(startupConfigError.message);
}

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

app.use((_req: Request, res: Response, next) => {
  if (!startupConfigError) {
    next();
    return;
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: 'Server configuration error. Check deployment logs.',
    details: isDevelopment ? startupConfigError.message : undefined,
  });
});

// ── Health check ────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'El TopUp API' });
});

app.get('/debug-env', (_req: Request, res: Response) => {
  res.json({
    node_env: process.env.NODE_ENV,
    startup_error: startupConfigError?.message || null,
    has_supabase_ref: !!process.env.SUPABASE_PROJECT_REF,
    has_supabase_anon: !!process.env.SUPABASE_ANON_KEY,
    has_db_url: !!process.env.DATABASE_URL,
    has_midtrans_server: !!process.env.MIDTRANS_SERVER_KEY,
    has_midtrans_client: !!process.env.MIDTRANS_CLIENT_KEY,
    has_robuxship: !!process.env.ROBUXSHIP_API_KEY,
  });
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