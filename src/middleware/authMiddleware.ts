import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface AuthRequest extends Request { user?: any; }

const client = jwksClient({
  jwksUri: `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/auth/v1/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 3600000,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

export const requireAuth = (
  req: AuthRequest, res: Response, next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, getKey, { audience: 'authenticated' }, (err, payload) => {
    if (err) {
      res.status(403).json({ error: 'Forbidden: Invalid or expired token', detail: err.message });
      return;
    }
    req.user = payload;
    next();
  });
};