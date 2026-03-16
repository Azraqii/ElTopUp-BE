import express, { type Request, type Response } from 'express';

const app = express();

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', test: true });
});

app.get('/debug-env', (_req: Request, res: Response) => {
  res.json({
    node_env: process.env.NODE_ENV,
    has_supabase_ref: !!process.env.SUPABASE_PROJECT_REF,
    has_db_url: !!process.env.DATABASE_URL,
    has_midtrans: !!process.env.MIDTRANS_SERVER_KEY,
    has_robuxship: !!process.env.ROBUXSHIP_API_KEY,
  });
});

export default app;