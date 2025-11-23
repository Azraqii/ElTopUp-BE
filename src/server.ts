// src/server.ts

import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import userRoutes from './routes/userRoutes';

dotenv.config();

const PORT: number = parseInt(process.env.PORT || '5001', 10);
const MONGO_URI: string = process.env.MONGO_URI || '';

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use('/api/users', userRoutes);

// --- Connect DB & Start Server ---
const connectDB = async () => {
    if (!MONGO_URI) {
        console.warn("⚠️ MONGO_URI is not set in .env");
        return;
    }
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connected successfully!');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
    }
};

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`⚡️ Server is running at http://localhost:${PORT}`);
    });
}

startServer();