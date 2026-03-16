import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthRequest extends Request {
  user?: any;
}

// Lazy — jangan inisialisasi di top level
let _JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!_JWKS) {
    const ref = process.env.SUPABASE_PROJECT_REF;
    if (!ref) throw new Error('SUPABASE_PROJECT_REF is not set');
    _JWKS = createRemoteJWKSet(
      new URL(`https://${ref}.supabase.co/auth/v1/.well-known/jwks.json`)
    );
  }
  return _JWKS;
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
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/auth/v1`,
      audience: 'authenticated',
    });
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};