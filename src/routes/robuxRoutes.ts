import express from 'express';
import { validateGamepass } from '../controllers/robuxController';

const router = express.Router();

// Validasi Gamepass (Scanner)
// URL: POST http://localhost:5001/api/robux/validate-gamepass
router.post('/validate-gamepass', validateGamepass);

export default router;