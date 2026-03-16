import express, { type Request, type Response } from 'express';
import { requireAuth } from './middleware/authMiddleware';
import { register, login, syncProfile, getMe } from './controllers/authController';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'authcontroller-only' });
});

export default app;