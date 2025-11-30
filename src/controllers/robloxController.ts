import { Request, Response } from 'express';
import axios from 'axios';

const userCache = new Map<string, any>();

// Fungsi Helper: Tidur sebentar (Delay)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const lookupUser = async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username wajib diisi' });
  }

  // 1. Cek Cache
  if (userCache.has(username)) {
    console.log(`⚡ Cache Hit: ${username}`);
    return res.json(userCache.get(username));
  }

  try {
    const userPayload = {
      usernames: [username],
      excludeBannedUsers: true
    };

    // 2. HIT API USER (Dengan Retry Manual Sederhana)
    let userRes;
    try {
      userRes = await axios.post('https://users.roblox.com/v1/usernames/users', userPayload);
    } catch (err: any) {
      // Jika kena limit 429, tunggu 2 detik lalu coba sekali lagi
      if (err.response && err.response.status === 429) {
        console.log("⚠️ Kena Rate Limit. Mencoba lagi dalam 2 detik...");
        await sleep(2000); 
        userRes = await axios.post('https://users.roblox.com/v1/usernames/users', userPayload);
      } else {
        throw err; // Lempar error lain
      }
    }

    const userData = userRes.data.data;

    if (userData.length === 0) {
      return res.status(404).json({ message: 'User Roblox tidak ditemukan' });
    }

    const { id, name, displayName } = userData[0];

    // 3. HIT API THUMBNAIL
    // Avatar biasanya jarang kena limit, tapi kita try-catch juga
    let avatarUrl = 'https://placehold.co/150';
    try {
        const thumbRes = await axios.get(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=true`
        );
        avatarUrl = thumbRes.data.data[0]?.imageUrl || avatarUrl;
    } catch (error) {
        console.warn("Gagal load avatar, pakai default.");
    }

    const result = { id, username: name, displayName, avatarUrl };

    // 4. Simpan Cache
    userCache.set(username, result);
    setTimeout(() => userCache.delete(username), 5 * 60 * 1000);

    res.json(result);

  } catch (error: any) {
    // Jika setelah retry masih gagal juga, baru nyerah
    console.error('Roblox API Error:', error.message);
    
    if (error.response && error.response.status === 429) {
        return res.status(429).json({ message: 'Server Roblox sibuk. Coba lagi nanti.' });
    }
    res.status(500).json({ message: 'Gagal terhubung ke Roblox' });
  }
};