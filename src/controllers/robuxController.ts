import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// CONFIG 1: UNTUK KE ROBLOX ASLI (Pakai Cookie - Khusus User Lookup)
const getRobloxConfig = () => {
  const cookie = process.env.ROBLOX_COOKIE;
  if (!cookie) return {};
  return {
    headers: {
      'Cookie': `.ROBLOSECURITY=${cookie}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  };
};

// CONFIG 2: UNTUK KE PROXY (TANPA COOKIE - Khusus Scanning)
// Kita tidak boleh kirim cookie ke proxy demi keamanan!
const getProxyConfig = () => {
  return {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  };
};

// --- FUNGSI 1: LOOKUP USER (Tetap pakai Roblox Asli) ---
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

// --- FUNGSI 2: VALIDASI GAMEPASS (PROXY SCANNER STRATEGY) ---
export const validateGamepass = async (req: Request, res: Response) => {
  const { username, nominal } = req.body; 

  if (!username || !nominal) {
    return res.status(400).json({ message: 'Username dan Nominal wajib diisi.' });
  }

  const targetPrice = Math.round(Number(nominal) / 0.7);

  try {
    // 1. DAPATKAN ID USER (Pakai Roblox Asli + Cookie)
    const userRes = await axios.post('https://users.roblox.com/v1/usernames/users', 
        { usernames: [username], excludeBannedUsers: true },
        getRobloxConfig()
    );
    
    if (userRes.data.data.length === 0) return res.status(404).json({ message: 'User Roblox tidak ditemukan' });
    
    const userId = userRes.data.data[0].id;
    const { name } = userRes.data.data[0];

    console.log(`\n🕵️  BOT SCANNING (PROXY): ${username} (ID: ${userId})`);
    console.log(`🎯  Mencari Target: ${targetPrice} Robux`);

    // 2. AMBIL DAFTAR GAME (Pakai RoProxy - Tanpa Cookie)
    // URL: https://games.roproxy.com/v2/users/{userId}/games
    let games = [];
    try {
        const gamesRes = await axios.get(
            `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=Public&limit=50&sortOrder=Asc`,
            getProxyConfig()
        );
        games = gamesRes.data.data || [];
        console.log(`   📂 Ditemukan ${games.length} game publik (via Proxy).`);
    } catch (e: any) {
        console.log(`   ❌ Gagal ambil game: ${e.message}`);
        return res.status(500).json({ message: 'Gagal memindai game user (Proxy Error).' });
    }

    if (games.length === 0) {
        return res.status(400).json({ message: 'User tidak memiliki Game Publik.' });
    }

    let foundGamepass = null;

    // 3. SCAN GAMEPASS (Pakai RoProxy - Tanpa Cookie)
    for (const game of games) {
        const universeId = game.id; 
        process.stdout.write(`   👉 Cek Game "${game.name}"... `); 
        
        try {
            // URL: https://games.roproxy.com/v1/games/{universeId}/game-passes
            const passUrl = `https://games.roproxy.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`;
            
            const passRes = await axios.get(passUrl, getProxyConfig());
            const passes = passRes.data.data;

            if (passes && passes.length > 0) {
                const prices = passes.map((p: any) => p.price);
                console.log(`Harga: [${prices.join(', ')}]`);

                const match = passes.find((p: any) => p.price === targetPrice);
                if (match) {
                    foundGamepass = {
                        id: match.id,
                        name: match.name,
                        price: match.price,
                        imgUrl: `https://www.roblox.com/game-pass/${match.id}/`
                    };
                    break; // KETEMU! STOP LOOP.
                }
            } else {
                console.log(`(Kosong)`);
            }

        } catch (err: any) {
            console.log(`SKIP (${err.response?.status || err.message})`);
        }
        
        await sleep(100); // Jeda sopan
    }

    // 4. HASIL AKHIR
    if (foundGamepass) {
        // @ts-ignore
        console.log(`✅  SUKSES! DITEMUKAN: ${foundGamepass.name} (${foundGamepass.price} R$)`);
        return res.json({
            valid: true,
            message: 'Gamepass valid. Lanjutkan ke Checkout.',
            username: name,
            userId: userId,
            // @ts-ignore
            gamepassId: foundGamepass.id,
            // @ts-ignore
            gamepassName: foundGamepass.name,
            requiredPrice: targetPrice,
            originalNominal: Number(nominal),
            // @ts-ignore
            imgUrl: foundGamepass.imgUrl
        });
    } else {
        console.log(`❌  GAGAL TOTAL. Target: ${targetPrice}`);
        return res.status(400).json({ 
            valid: false, 
            message: `Gamepass seharga ${targetPrice} Robux tidak ditemukan otomatis. Pastikan harga benar.`,
            requiredPrice: targetPrice,
            manualCheckRequired: true // Opsi input manual tetap ada sebagai cadangan
        });
    }

  } catch (error: any) {
    console.error('❌ SYSTEM ERROR:', error.message);
    res.status(500).json({ message: 'Server Error saat scanning' });
  }
};