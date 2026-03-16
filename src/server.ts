import express, { type Request, type Response } from 'express';
import { requireAuth } from './middleware/authMiddleware';
import { register, login, syncProfile, getMe } from './controllers/authController';
import orderRoutes from './routes/orderRoutes';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'with-orderroutes' });
});

app.use('/api/orders', orderRoutes);

export default app;