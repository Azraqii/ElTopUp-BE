import express, { type Request, type Response } from 'express';
import { register, login, syncProfile, getMe } from './controllers/authController';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'auth-no-middleware' });
});

app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/sync', syncProfile);
app.get('/api/auth/me', getMe);

export default app;