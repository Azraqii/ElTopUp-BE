import express, { type Request, type Response } from 'express';
import authRoutes from './routes/authRoutes';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'auth-only' });
});

app.use('/api/auth', authRoutes);

export default app;