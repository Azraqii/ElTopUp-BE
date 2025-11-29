import { Request, Response } from 'express';
import Game from '../models/Game';
import Item from '../models/Item';

// @desc    Ambil Daftar Game (Tanpa Robux)
// @route   GET /api/games
// @access  Public
export const getGames = async (req: Request, res: Response) => {
  try {
    // Filter: Ambil yang kategorinya BUKAN 'Currency'
    // Tujuannya agar Robux tidak muncul di list game biasa
    const games = await Game.find({ 
      isActive: true,
      category: { $ne: 'Currency' } 
    }).sort({ name: 1 });
    
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching games', error });
  }
};

// @desc    Ambil Khusus Paket Robux
// @route   GET /api/games/robux-packages
// @access  Public
export const getRobuxPackages = async (req: Request, res: Response) => {
  try {
    // 1. Cari Parent Game yang kategorinya Currency (Robux Top Up)
    const robuxGame = await Game.findOne({ category: 'Currency', isActive: true });

    if (!robuxGame) {
      return res.status(404).json({ message: 'Layanan Robux sedang tidak tersedia' });
    }

    // 2. Ambil item-item (100, 400, 800 Robux) yang terkait
    const packages = await Item.find({ game: robuxGame._id, isActive: true })
      .sort({ price: 1 }); // Urutkan harga termurah ke termahal

    // Kembalikan paketnya saja, atau bisa juga dibungkus object { game, packages }
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching robux', error });
  }
};

// @desc    Ambil Detail Game Tertentu + Itemnya (Blox Fruit, dll)
// @route   GET /api/games/:slug
// @access  Public
export const getGameDetail = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // 1. Cari Gamenya
    const game = await Game.findOne({ slug, isActive: true });
    
    if (!game) {
      return res.status(404).json({ message: 'Game tidak ditemukan' });
    }

    // 2. Cari Itemnya
    const items = await Item.find({ game: game._id, isActive: true })
      .sort({ price: 1 });

    res.json({
      game,
      items
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching detail', error });
  }
};