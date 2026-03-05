import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './src/models/Game';
import Item from './src/models/Item';
import User from './src/models/userModel';

dotenv.config();

console.log("🚀 Script Seeding Katalog Dimulai...");

const seedData = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing in .env");
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔌 Database Connected.');

    // 1. BERSIHKAN DATA LAMA
    await Game.deleteMany({});
    await Item.deleteMany({});
    // await User.deleteMany({}); // Uncomment jika ingin reset user admin juga
    console.log('🧹 Data Katalog lama dibersihkan.');

    // =========================================
    // KATEGORI 1: ROBUX UTAMA (Mata Uang)
    // =========================================
    const robloxGlobal = await Game.create({
      name: 'Robux Top Up',
      slug: 'roblox-topup', 
      thumbnailUrl: 'https://placehold.co/600x400/png?text=Robux+TopUp',
      category: 'Currency', // <--- Penanda Khusus
      isActive: true
    });

    const robuxItems = [
      { name: '100 Robux', price: 15000, nominal: 100 },
      { name: '400 Robux', price: 60000, nominal: 400 },
      { name: '800 Robux', price: 120000, nominal: 800 },
      { name: '1700 Robux', price: 250000, nominal: 1700 },
      { name: '4500 Robux', price: 650000, nominal: 4500 },
    ].map(p => ({
      game: robloxGlobal._id,
      name: p.name,
      price: p.price,
      nominal: p.nominal,
      type: 'robux', // Tipe item untuk trigger bot
      imageUrl: 'https://placehold.co/200x200/png?text=Robux',
      isActive: true
    }));

    // =========================================
    // KATEGORI 2: GAME ITEMS (Manual Trade)
    // =========================================
    
    // A. Blox Fruits
    const bloxFruits = await Game.create({
      name: 'Blox Fruits',
      slug: 'blox-fruits',
      thumbnailUrl: 'https://placehold.co/600x400/png?text=Blox+Fruits',
      category: 'Game Item',
      isActive: true
    });

    const bloxFruitItems = [
      { name: 'Leopard Fruit', price: 75000 },
      { name: 'Dough Fruit', price: 50000 },
      { name: 'Dragon Fruit', price: 85000 },
      { name: 'Kitsune Fruit', price: 120000 },
    ].map(p => ({
      game: bloxFruits._id,
      name: p.name,
      price: p.price,
      nominal: 0,
      type: 'item', // Tipe item untuk admin dashboard
      imageUrl: 'https://placehold.co/200x200/png?text=Fruit',
      isActive: true
    }));

    // B. Adopt Me
    const adoptMe = await Game.create({
      name: 'Adopt Me',
      slug: 'adopt-me',
      thumbnailUrl: 'https://placehold.co/600x400/png?text=Adopt+Me',
      category: 'Game Item',
      isActive: true
    });

    const adoptMeItems = [
      { name: 'Fly Potion', price: 25000 },
      { name: 'Ride Potion', price: 20000 },
      { name: 'Shadow Dragon', price: 150000 },
    ].map(p => ({
      game: adoptMe._id,
      name: p.name,
      price: p.price,
      nominal: 0,
      type: 'item',
      imageUrl: 'https://placehold.co/200x200/png?text=Pet',
      isActive: true
    }));

    // 2. INSERT ITEMS
    await Item.insertMany([...robuxItems, ...bloxFruitItems, ...adoptMeItems]);
    console.log(`✅ Items Inserted: ${robuxItems.length} Robux + ${bloxFruitItems.length + adoptMeItems.length} Game Items`);

    // 3. CREATE ADMIN (Jika belum ada)
    const adminExists = await User.findOne({ email: 'admin@eltopup.id' });
    if (!adminExists) {
      await User.create({ email: 'admin@eltopup.id', password: 'admin123', role: 'admin' });
      console.log('✅ Admin User Created.');
    }

    console.log('🎉 Seeding Selesai!');
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seedData();