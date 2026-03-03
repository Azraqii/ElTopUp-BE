import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthRequest extends Request {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
}

// Supabase public JWKS endpoint — returns EC public keys for ES256 verification.
// createRemoteJWKSet caches the keys and re-fetches when needed.
const JWKS = createRemoteJWKSet(
  new URL(
    `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/auth/v1/.well-known/jwks.json`,
  ),
);

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
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/auth/v1`,
      audience: 'authenticated',
    });
    // payload.sub = Supabase user UUID
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};
