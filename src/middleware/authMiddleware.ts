import { Request, Response, NextFunction } from 'express';
import { verifyUserJwt, verifyAdminJwt } from '../services/authService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AuthRequest extends Request { user?: any; }

export const requireAuth = (
  req: AuthRequest, res: Response, next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyUserJwt(token);
    req.user = payload;
    next();
  } catch {
    res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};

export const requireAdminAuth = (
  req: AuthRequest, res: Response, next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAdminJwt(token);
    if (payload.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Hanya admin yang dapat mengakses resource ini.' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(403).json({ error: 'Token admin tidak valid atau sudah kadaluarsa.' });
  }
};
