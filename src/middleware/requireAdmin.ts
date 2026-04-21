import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Hanya admin yang dapat mengakses resource ini.' });
    return;
  }
  next();
};
