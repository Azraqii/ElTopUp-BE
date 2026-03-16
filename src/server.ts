import express, { type Request, type Response } from 'express';
import { validateGamepass } from './services/robuxshipService';

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', step: 'robuxship-imported' });
});

export default app;