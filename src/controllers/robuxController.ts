import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Helper untuk delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getRobloxConfig = () => {
  const cookie = process.env.ROBLOX_COOKIE;
  if (!cookie) return {};
  return {
    headers: {
      'Cookie': `.ROBLOSECURITY=${cookie}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  };
};

// Helper: Fetch dengan Retry Otomatis (Anti-429)
const axiosGetWithRetry = async (url: string, config: any, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, config);
        } catch (error: any) {
            const status = error.response?.status;
            // Jika error 429 (Rate Limit) atau 503 (Server Busy) dan masih punya sisa nyawa
            if ((status === 429 || status === 503) && i < retries - 1) {
                console.log(`⚠️ Kena Rate Limit (${status}). Tunggu 2 detik... (Percobaan ${i + 1}/${retries})`);
                await sleep(2000); // Tunggu 2 detik
                continue; // Coba lagi
            }
            throw error; // Jika error lain (404/400) atau nyawa habis, lempar error
        }
    }
};

// --- FUNGSI 1: LOOKUP USER (Tetap) ---
const userCache = new Map<string, any>();
export const lookupUser = async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username wajib diisi' });
  if (userCache.has(username)) return res.json(userCache.get(username));

  try {
    const userRes = await axios.post('https://users.roblox.com/v1/usernames/users', 
        { usernames: [username], excludeBannedUsers: true },
        getRobloxConfig()
    );
    
    if (userRes.data.data.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });
    
    const { id, name, displayName } = userRes.data.data[0];
    let avatarUrl = 'https://placehold.co/150';
    try {
        const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=true`);
        avatarUrl = thumbRes.data.data[0]?.imageUrl || avatarUrl;
    } catch (e) {}

    const result = { id, username: name, displayName, avatarUrl };
    userCache.set(username, result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal lookup user' });
  }
};

// --- FUNGSI 2: VALIDASI VIA LINK/ID (API MODERN + DEBUG LENGKAP) ---
export const validateGamepass = async (req: Request, res: Response) => {
  const { username, nominal, gamepassLink } = req.body; 

  if (!username || !nominal || !gamepassLink) {
    return res.status(400).json({ message: 'Mohon isi Username, Nominal, dan Link/ID Gamepass.' });
  }

  // Ekstrak ID
  let gamepassId = "";
  const linkMatch = gamepassLink.toString().match(/game-pass\/(\d+)/);
  if (linkMatch) {
      gamepassId = linkMatch[1];
  } else if (/^\d+$/.test(gamepassLink.toString())) {
      gamepassId = gamepassLink.toString();
  } else {
      return res.status(400).json({ message: 'Format Link/ID Gamepass tidak valid.' });
  }

  const targetPrice = Math.ceil(Number(nominal) / 0.7);

  console.log(`\n🔗 INPUT: ${gamepassLink}`);
  console.log(`🆔 ID: ${gamepassId} | 🎯 TARGET: ${targetPrice} R$`);

  try {
    // 1. CEK USER ID
    const userRes = await axios.post('https://users.roblox.com/v1/usernames/users', 
        { usernames: [username], excludeBannedUsers: true }, getRobloxConfig());
    
    if (userRes.data.data.length === 0) return res.status(404).json({ message: 'Username Roblox tidak ditemukan' });
    const userId = userRes.data.data[0].id;

    // 2. CEK GAMEPASS (API MODERN - apis.roblox.com)
    // URL ini lebih stabil untuk Gamepass baru
    const productUrl = `https://apis.roblox.com/game-passes/v1/game-passes/${gamepassId}/product-info`;
    
    const productRes = await axiosGetWithRetry(productUrl, getRobloxConfig());
    const data = productRes?.data;

    // DEBUG: Cetak respons asli di terminal agar kita tahu struktur datanya
    console.log("📦 RAW ROBLOX DATA:", JSON.stringify(data, null, 2));

    // Mapping Data (Mencoba berbagai kemungkinan format)
    const gpName = data.name || data.Name;
    const gpPrice = data.priceInRobux ?? data.PriceInRobux;
    const gpIsForSale = data.isForSale ?? data.IsForSale;
    
    // Creator ID bisa bersarang atau langsung
    const gpCreatorId = data.creatorId ?? data.Creator?.CreatorTargetId ?? data.creatorTargetId; 
    const gpCreatorName = data.creatorName ?? data.Creator?.Name;

    console.log(`🔎 INFO: "${gpName}" | Harga: ${gpPrice} | CreatorID: ${gpCreatorId}`);

    // 3. VALIDASI PEMILIK
    if (String(gpCreatorId) !== String(userId)) {
        return res.status(400).json({ 
            valid: false, 
            message: `Gamepass ini milik user ID '${gpCreatorId}' (${gpCreatorName}), bukan milik '${username}' (ID: ${userId}).` 
        });
    }

    // 4. VALIDASI HARGA
    if (gpIsForSale && gpPrice === targetPrice) {
        console.log("✅ VALIDASI SUKSES!");
        return res.json({
            valid: true,
            message: 'Gamepass valid.',
            username: username,
            userId: userId,
            gamepassId: Number(gamepassId),
            gamepassName: gpName,
            price: gpPrice,
            imgUrl: `https://www.roblox.com/game-pass/${gamepassId}/`,
            originalNominal: Number(nominal)
        });
    } else {
        console.log(`❌ GAGAL: Harga/Status Salah.`);
        return res.status(400).json({ 
            valid: false, 
            message: `Harga Gamepass salah. Terdaftar: ${gpPrice || 'Offsale'}. Wajib: ${targetPrice} Robux.`,
            requiredPrice: targetPrice
        });
    }

  } catch (error: any) {
    console.error('❌ API ERROR:', error.message);
    if(error.response?.data) {
        console.error('❌ API RESPONSE:', JSON.stringify(error.response.data));
    }
    
    if (error.response?.status === 404 || error.response?.status === 400) {
        return res.status(404).json({ message: 'ID Gamepass tidak ditemukan. Pastikan link benar dan Gamepass publik.' });
    }
    if (error.response?.status === 429) {
        return res.status(429).json({ message: 'Server Roblox sibuk (429). Mohon tunggu sebentar lalu coba lagi.' });
    }
    
    res.status(500).json({ message: 'Server Error saat validasi.' });
  }
};