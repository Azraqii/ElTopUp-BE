import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.SUPABASE_JWT_SECRET as string;
    if (!secret) throw new Error('SUPABASE_JWT_SECRET not set');

    // Supabase JWT secret is base64-encoded — must decode before verifying
    const secretBuffer = Buffer.from(secret, 'base64');

    const payload = jwt.verify(token, secretBuffer, {
      audience: 'authenticated',
    });

    req.user = payload;
    next();
  } catch (err: any) {
    res.status(403).json({ error: 'Forbidden: Invalid or expired token', detail: err.message });
  }
};