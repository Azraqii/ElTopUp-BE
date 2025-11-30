import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';

// Import Routes
import userRoutes from './routes/userRoutes';
import orderRoutes from './routes/orderRoutes';
import gameRoutes from './routes/gameRoutes';
import adminRoutes from './routes/adminRoutes';
// itemRoutes DIHAPUS karena fungsinya sudah dipindah ke adminRoutes
import robloxRoutes from './routes/robloxRoutes';

dotenv.config();

const PORT: number = parseInt(process.env.PORT || '5001', 10);
const MONGO_URI: string = process.env.MONGO_URI || '';

const app = express();

app.use(cors());
app.use(express.json());

// --- Routes Registration ---
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);
// app.use('/api/items', itemRoutes); // DIHAPUS
app.use('/api/roblox', robloxRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('API El TopUp is Running...');
});

const connectDB = async () => {
    if (!MONGO_URI) return;
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