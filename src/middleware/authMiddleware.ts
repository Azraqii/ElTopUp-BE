import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';

export interface AuthRequest extends Request {
  user?: any;
}

let _publicKeys: Record<string, string> = {};
let _keysLastFetched = 0;

async function getSupabasePublicKey(kid: string): Promise<string> {
  const now = Date.now();
  // Cache keys for 1 hour
  if (_publicKeys[kid] && now - _keysLastFetched < 3600000) {
    return _publicKeys[kid];
  }

  const ref = process.env.SUPABASE_PROJECT_REF;
  const response = await axios.get(
    `https://${ref}.supabase.co/auth/v1/.well-known/jwks.json`
  );

  const keys = response.data.keys;
  _keysLastFetched = now;

  for (const key of keys) {
    // Convert JWK to PEM using Supabase JWT secret instead
    _publicKeys[key.kid] = key.n; // placeholder
  }

  return _publicKeys[kid];
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

    const payload = jwt.verify(token, secret, {
      audience: 'authenticated',
    });

    req.user = payload;
    next();
  } catch (error: any) {
    res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};