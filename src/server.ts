import express, { type Request, type Response } from 'express';
import webhookRoutes from './routes/webhookRoutes';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'webhook-mounted' });
});

app.use('/api/webhooks', webhookRoutes);

export default app;