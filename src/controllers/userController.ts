// src/controllers/userController.ts

import { type Request, type Response } from 'express';
import User, { IUser } from '../models/userModel';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose'; // Diperlukan untuk tipe mongoose.Types.ObjectId

// Fungsi Helper untuk membuat Token JWT
const generateToken = (id: mongoose.Types.ObjectId): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '7d', // Token kedaluwarsa dalam 7 hari
  });
};

// @desc    Register user baru (Sign Up)
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User dengan email ini sudah terdaftar.' });
    }

    // Password otomatis di-hash oleh middleware di userModel
    const user: IUser = await User.create({ email, password });

    if (user) {
      res.status(201).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id as mongoose.Types.ObjectId), // Berikan Token
      });
    } else {
      res.status(400).json({ message: 'Data user tidak valid.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Gagal mendaftar user.', error: (error as Error).message });
  }
};


// @desc    Authenticate user & get token (Sign In)
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        // 1. Cari user & Dapatkan password (karena kita set select: false)
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.comparePassword(password))) {
            // 2. Login Berhasil
            res.json({
                _id: user._id,
                email: user.email,
                role: user.role,
                token: generateToken(user._id as mongoose.Types.ObjectId), // Berikan Token
            });
        } else {
            // 3. Login Gagal
            res.status(401).json({ message: 'Email atau password tidak valid.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Gagal login.', error: (error as Error).message });
    }
};