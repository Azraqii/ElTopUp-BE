// src/controllers/userController.ts

import { type Request, type Response } from 'express';
import User from '../models/userModel'; // Import User saja, IUser biasanya sudah ter-link
import { generateToken } from '../utils/authHelpers'; // GUNAKAN IMPORT INI

// @desc    Register user baru
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // 1. Validasi Input Sederhana
  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan Password wajib diisi.' });
  }

  try {
    // 2. Cek User Exist
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User dengan email ini sudah terdaftar.' });
    }

    // 3. Create User
    const user = await User.create({ email, password });

    if (user) {
      res.status(201).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        // Pastikan konversi ke string agar aman
        token: generateToken(user._id as any), 
      });
    } else {
      res.status(400).json({ message: 'Data user tidak valid.' });
    }
  } catch (error) {
    console.error("Register Error:", error); // Log error ke terminal agar kelihatan
    res.status(500).json({ message: 'Gagal mendaftar user.', error: (error as Error).message });
  }
};

// @desc    Login User
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // 1. Validasi Input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan Password wajib diisi.' });
    }

    try {
        // 2. Cari user (termasuk password hash)
        const user = await User.findOne({ email }).select('+password');

        // 3. Cek User & Password
        // Pastikan user ada DULUAN sebelum cek password
        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                email: user.email,
                role: user.role,
                token: generateToken(user._id as any),
            });
        } else {
            res.status(401).json({ message: 'Email atau password salah.' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Gagal login.', error: (error as Error).message });
    }
};