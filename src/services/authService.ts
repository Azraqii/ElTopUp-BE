import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';

const USER_JWT_SECRET = process.env.USER_JWT_SECRET || process.env.JWT_SECRET || '';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || '';
const USER_JWT_EXPIRES_IN = process.env.USER_JWT_EXPIRES_IN || '7d';
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '8h';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signUserJwt(payload: { sub: string; email: string; name?: string; role: string }): string {
  const options: SignOptions = { expiresIn: USER_JWT_EXPIRES_IN as unknown as SignOptions['expiresIn'] };
  return jwt.sign(payload, USER_JWT_SECRET, options);
}

export function signAdminJwt(payload: { sub: string; email: string; role: string }): string {
  const options: SignOptions = { expiresIn: ADMIN_JWT_EXPIRES_IN as unknown as SignOptions['expiresIn'] };
  return jwt.sign(payload, ADMIN_JWT_SECRET, options);
}

export function verifyUserJwt(token: string): JwtPayload {
  return jwt.verify(token, USER_JWT_SECRET) as JwtPayload;
}

export function verifyAdminJwt(token: string): JwtPayload {
  return jwt.verify(token, ADMIN_JWT_SECRET) as JwtPayload;
}
