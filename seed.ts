import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './src/models/Game';
import Item from './src/models/Item';
import User from './src/models/userModel';

// Load Environment Variables
dotenv.config();

// Debugging Log - Biar tahu script jalan
console.log("🚀 Script Seeding dimulai..."); 

const seedData = async () => {
  try {
    // 1. Cek Koneksi
    if (!process.env.MONGO_URI) {
        throw new Error("❌ MONGO_URI tidak ditemukan di file .env");
    }
    
    console.log("⏳ Sedang menyambungkan ke Database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔌 Database Connected!');

    // 2. BERSIHKAN DATA LAMA
    await Game.deleteMany({});
    await Item.deleteMany({});
    // User admin jangan dihapus dulu biar token kamu gak expired
    
    console.log('🧹 Data Game & Item lama dibersihkan.');

    // 3. BUAT GAME: ROBLOX
    const roblox = await Game.create({
      name: 'Roblox',
      slug: 'roblox',
      thumbnailUrl: 'https://placehold.co/600x400/png?text=Roblox+Banner',
      category: 'Sandbox', // Pastikan model Game sudah ada field category
      isActive: true
    });
    console.log('✅ Game Created: Roblox');

    // 4. BUAT PRODUK

    // A. Tipe ROBUX (Bot)
    const robuxPackages = [
      { name: '100 Robux', price: 15000, nominal: 100 },
      { name: '400 Robux', price: 60000, nominal: 400 },
      { name: '800 Robux', price: 120000, nominal: 800 },
    ];

    const robuxItemsData = robuxPackages.map(p => ({
      game: roblox._id,
      name: p.name,
      price: p.price,
      nominal: p.nominal,
      type: 'robux',
      imageUrl: 'https://placehold.co/200x200/png?text=Robux',
      isActive: true
    }));

    // B. Tipe ITEM (Manual)
    const gameItems = [
      { name: 'Leopard Fruit', price: 75000 },
      { name: 'Dough Fruit', price: 50000 },
    ];

    const manualItemsData = gameItems.map(p => ({
      game: roblox._id,
      name: p.name,
      price: p.price,
      nominal: 0, 
      type: 'item',
      imageUrl: 'https://placehold.co/200x200/png?text=Item',
      isActive: true
    }));

    // Masukkan ke DB
    await Item.insertMany([...robuxItemsData, ...manualItemsData]);
    
    console.log(`✅ Berhasil insert: ${robuxItemsData.length} Robux & ${manualItemsData.length} Item Game.`);

    // 5. BUAT USER ADMIN (Cek dulu biar gak duplikat error)
    const adminEmail = 'admin@eltopup.id';
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (!adminExists) {
        await User.create({
            email: adminEmail,
            password: 'admin123',
            role: 'admin'
        });
        console.log('✅ Admin User Created: admin@eltopup.id');
    } else {
        console.log('ℹ️  Admin User sudah ada, skip creation.');
    }

    console.log('🎉 Seeding Selesai!');
    process.exit();

  } catch (error) {
    console.error('❌ Seeding Gagal:', error);
    process.exit(1);
  }
};

// --- PENTING: INI PEMANGGILNYA ---
seedData();