import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Order from '../models/Order';
import Item from '../models/Item';
import { purchaseGamepass } from '../utils/robloxBot'; 

interface AuthRequest extends Request {
  user?: any;
}

// --- FUNGSI CREATE ORDER (Tetap) ---
export const createOrder = async (req: AuthRequest, res: Response) => {
  const { itemId, quantity, robloxUsername, gamepassId, note, email } = req.body;
  const userId = req.user ? req.user._id : undefined;
  const customerEmail = req.user ? req.user.email : email;

  if (!customerEmail) return res.status(400).json({ message: 'Email wajib diisi.' });

  try {
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item tidak ditemukan' });

    if (item.type === 'robux' && !gamepassId) {
      return res.status(400).json({ message: 'Gamepass ID wajib diisi.' });
    }

    const qty = parseInt(quantity) || 1;
    const grossAmount = item.price * qty;
    const orderId = `TRX-${Date.now().toString().slice(-6)}-${uuidv4().split('-')[0].toUpperCase()}`;

    const newOrder = await Order.create({
      user: userId,
      email: customerEmail,
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

    res.status(201).json({ message: 'Order berhasil dibuat', order: newOrder });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memproses order', error });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data order', error });
  }
};

// --- FUNGSI SIMULATE PAYMENT (LOGIC FIXED) ---
export const simulatePayment = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (order.paymentStatus === 'PAID') return res.status(400).json({ message: 'Order sudah dibayar.' });

    // 1. Update Status Pembayaran
    order.paymentStatus = 'PAID';
    order.orderStatus = 'PROCESSING';
    await order.save();

    console.log(`\n💰 Order ${order.midtransOrderId} DIBAYAR. Memulai Bot...`);

    // 2. TRIGGER BOT
    if (order.itemType === 'robux' && order.gamepassId) {
        
        // Ambil nominal asli dari Database Item
        const itemData = await Item.findById(order.item);
        const nominalBeli = itemData?.nominal || 0; 
        
        if (nominalBeli > 0) {
            // FIX: Gunakan Math.ceil agar pembulatan ke ATAS (Aman pajak)
            // 1 / 0.7 = 1.42 -> Ceil jadi 2.
            const targetPrice = Math.ceil(nominalBeli / 0.7); 
            
            console.log(`   🎯 Nominal: ${nominalBeli} -> Target Harga: ${targetPrice} R$`);

            purchaseGamepass(order.gamepassId, targetPrice)
                .then(async (result) => {
                    if (result.success) {
                        order.orderStatus = 'COMPLETED';
                        await order.save();
                        console.log(`✅ Order SELESAI (Bot Sukses).`);
                    } else {
                        console.log(`⚠️ Order Gagal Diproses Bot. Cek Log.`);
                    }
                });
        }
    }

    res.json({ 
        message: 'Pembayaran Berhasil. Bot sedang memproses di background.', 
        order 
    });

  } catch (error) {
    res.status(500).json({ message: 'Gagal update pembayaran', error });
  }
};