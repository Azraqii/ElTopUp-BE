import express, { type Request, type Response } from 'express';
import { prisma } from './lib/prisma';

const app = express();
app.use(express.json());

app.get('/', async (_req: Request, res: Response) => {
  try {
    await prisma.$connect();
    res.json({ status: 'ok', step: 'prisma-connected' });
  } catch (e: any) {
    res.json({ status: 'error', message: e.message });
  }
});

export default app;