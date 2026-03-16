import express, { type Request, type Response } from 'express';
import { register, login, syncProfile, getMe } from './controllers/authController';
import { requireAuth } from './middleware/authMiddleware';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'auth-routes-only' });
});

app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/sync', requireAuth, syncProfile);
app.get('/api/auth/me', requireAuth, getMe);

export default app;