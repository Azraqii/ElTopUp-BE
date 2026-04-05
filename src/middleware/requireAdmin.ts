// src/middleware/requireAdmin.ts
// Guard untuk semua endpoint dashboard admin.
// Harus dipasang SETELAH requireAuth karena butuh req.user.

import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  next();
};