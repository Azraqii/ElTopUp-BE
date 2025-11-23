// src/utils/authHelpers.ts

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import type { IUser } from '../models/userModel';

export const generateToken = (id: mongoose.Types.ObjectId): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });
};