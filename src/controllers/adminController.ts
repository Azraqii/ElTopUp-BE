import { Request, Response } from 'express';
import Order from '../models/Order';
import Game from '../models/Game';
import Item from '../models/Item';

// ==========================================
// 1. ORDER FULFILLMENT (URUSAN PESANAN)
// ==========================================

// @desc    Ambil Order yang PERLU DIPROSES (Status PAID tapi belum COMPLETED)
// @route   GET /api/admin/orders/incoming
export const getIncomingOrders = async (req: Request, res: Response) => {
  try {
    // Cari order yang sudah dibayar (PAID) DAN statusnya masih PROCESSING/PENDING
    const orders = await Order.find({
      paymentStatus: 'PAID',
      orderStatus: { $ne: 'COMPLETED' } // $ne = Not Equal (Bukan Completed)
    })
    .sort({ createdAt: 1 }) // Urutkan dari yang terlama (biar antrian adil)
    .populate('user', 'email'); // Ambil info email user jika ada

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data order', error });
  }
};

// @desc    Tandai Order sebagai SELESAI (Admin sudah kirim barang)
// @route   PUT /api/admin/orders/:id/complete
export const completeOrder = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    if (order.paymentStatus !== 'PAID') {
      return res.status(400).json({ message: 'Order belum dibayar, tidak bisa diselesaikan!' });
    }

    order.orderStatus = 'COMPLETED';
    await order.save();

    res.json({ message: 'Order selesai! Stok aman.', order });
  } catch (error) {
    res.status(500).json({ message: 'Gagal update status order', error });
  }
};

// ==========================================
// 2. CATALOG MANAGEMENT (INPUT DATA)
// ==========================================

// @desc    Tambah Game Baru
// @route   POST /api/admin/games
export const addGame = async (req: Request, res: Response) => {
  try {
    const { name, thumbnailUrl, category } = req.body;

    // Buat slug otomatis (misal: "Fish It!" -> "fish-it")
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const newGame = await Game.create({
      name,
      slug,
      thumbnailUrl,
      category: category || 'Game Item',
      isActive: true
    });

    res.status(201).json(newGame);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah game', error });
  }
};

// @desc    Tambah Item Baru ke dalam Game
// @route   POST /api/admin/items
export const addItem = async (req: Request, res: Response) => {
  try {
    const { gameId, name, price, imageUrl, type, nominal } = req.body;

    // Cek Game Induk
    const gameExists = await Game.findById(gameId);
    if (!gameExists) {
      return res.status(404).json({ message: 'Game induk tidak ditemukan' });
    }

    const newItem = await Item.create({
      game: gameId,
      name,
      price,
      imageUrl,
      type: type || 'item',
      nominal: nominal || 0,
      isActive: true
    });

    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah item', error });
  }
};