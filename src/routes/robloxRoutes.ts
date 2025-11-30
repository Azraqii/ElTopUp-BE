import express from 'express';
import { lookupUser } from '../controllers/robloxController';

const router = express.Router();

// Endpoint Public (Siapapun bisa cari user)
router.post('/lookup', lookupUser);

export default router;