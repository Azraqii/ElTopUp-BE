import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Order from '../models/Order';
import Item from '../models/Item';

// Interface user dari middleware
interface AuthRequest extends Request {
  user?: any;
}

// @desc    Buat Order Baru (Support Guest & Member)
// @route   POST /api/orders
// @access  Public (via Optional Protect)
export const createOrder = async (req: AuthRequest, res: Response) => {
  // Ambil input 'email' dari body (khusus guest)
  const { itemId, quantity, robloxUsername, gamepassId, note, email } = req.body;

  // LOGIKA HIBRIDA:
  // 1. Cek ID User (Kalau login ada isinya, kalau guest undefined)
  const userId = req.user ? req.user._id : undefined;
  
  // 2. Tentukan Email Pembeli
  // Jika User Login -> Ambil dari akunnya
  // Jika Guest -> Ambil dari input form
  const customerEmail = req.user ? req.user.email : email;

  // Validasi Email (Penting buat Guest)
  if (!customerEmail) {
    return res.status(400).json({ message: 'Email wajib diisi untuk bukti pesanan (Guest Mode).' });
  }

  try {
    // 1. Validasi Barang
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item tidak ditemukan' });
    }

    // 2. Validasi Khusus Robux
    if (item.type === 'robux' && !gamepassId) {
      return res.status(400).json({ message: 'Gamepass ID wajib diisi untuk pembelian Robux.' });
    }

    // 3. Hitung Total Harga
    const qty = parseInt(quantity) || 1;
    const grossAmount = item.price * qty;
    
    // 4. Buat Nomor Order Unik
    const orderId = `TRX-${Date.now().toString().slice(-6)}-${uuidv4().split('-')[0].toUpperCase()}`;

    // 5. Simpan ke Database
    const newOrder = await Order.create({
      user: userId,         // Bisa null/undefined
      email: customerEmail, // Wajib disimpan
      robloxUsername,
      item: item._id,
      itemName: item.name,
      itemType: item.type,
      quantity: qty,
      totalPrice: grossAmount,
      gamepassId: item.type === 'robux' ? gamepassId : undefined,
      note: item.type === 'item' ? note : undefined,
      midtransOrderId: orderId, 
      paymentStatus: 'UNPAID'
    });

    res.status(201).json({
      message: 'Order berhasil dibuat',
      order: newOrder
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ message: 'Gagal memproses order', error });
  }
};

// @desc    Simulasi Bayar (Testing Only)
// @route   POST /api/orders/:id/pay
// @access  Private (Harus Login / Admin)
export const simulatePayment = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({ message: 'Order ini sudah dibayar sebelumnya' });
    }

    // Update status jadi PAID
    order.paymentStatus = 'PAID';
    order.orderStatus = 'PROCESSING'; // Siap diproses Bot/Admin
    await order.save();

    res.json({ message: 'Pembayaran Berhasil (Simulasi)', order });
  } catch (error) {
    res.status(500).json({ message: 'Gagal update pembayaran', error });
  }
};