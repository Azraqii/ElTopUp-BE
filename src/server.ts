import express, { type Request, type Response } from 'express';
import { requireAuth } from './middleware/authMiddleware';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'middleware-only' });
});

export default app;