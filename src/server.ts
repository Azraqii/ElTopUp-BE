import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';

// Import Routes
import userRoutes from './routes/userRoutes';
import orderRoutes from './routes/orderRoutes'; // <--- PENTING: Import route order

dotenv.config();

const PORT: number = parseInt(process.env.PORT || '5001', 10);
const MONGO_URI: string = process.env.MONGO_URI || '';

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes Registration ---
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes); // <--- PENTING: Daftarkan endpoint /api/orders

// Default Route (Untuk cek apakah server nyala di browser)
app.get('/', (req: Request, res: Response) => {
  res.send('API El TopUp is Running...');
});

// --- Connect DB & Start Server ---
const connectDB = async () => {
    if (!MONGO_URI) {
        console.warn("⚠️ MONGO_URI is not set in .env");
        return;
    }
    try {
        console.log("⏳ Sedang mencoba koneksi ke MongoDB...");
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