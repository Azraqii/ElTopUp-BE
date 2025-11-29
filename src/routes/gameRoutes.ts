import express from 'express';
import { getGames, getGameDetail, getRobuxPackages } from '../controllers/gameController';

const router = express.Router();

// 1. Endpoint Khusus ROBUX (Harus ditaruh paling atas)
// URL: http://localhost:5001/api/games/robux-packages
router.get('/robux-packages', getRobuxPackages); 

// 2. Endpoint List Game Biasa (Exclude Robux)
// URL: http://localhost:5001/api/games
router.get('/', getGames);

// 3. Endpoint Detail Game (Dynamic Slug)
// URL: http://localhost:5001/api/games/blox-fruits
// Note: Ini harus paling bawah agar "robux-packages" tidak dianggap sebagai nama game
router.get('/:slug', getGameDetail);

export default router;