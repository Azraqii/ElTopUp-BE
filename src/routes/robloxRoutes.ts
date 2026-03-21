import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// ─── Ambil cookie dari env ────────────────────────────────────────────────────
// Set di .env:  ROBLOX_SECURITY_COOKIE=_|WARNING:-DO-NOT-SHARE-THIS...|xxxxxxx
// Akun yang dipakai bebas — read-only search, tidak ada risiko ban.
const ROBLOX_COOKIE = process.env.ROBLOX_SECURITY_COOKIE
  ? `.ROBLOSECURITY=${process.env.ROBLOX_SECURITY_COOKIE}`
  : '';

if (!ROBLOX_COOKIE) {
  console.warn(
    '[roblox] ROBLOX_SECURITY_COOKIE tidak di-set di .env. ' +
    'Endpoint /v1/users/search mungkin terbatas. ' +
    'Tambahkan ROBLOX_SECURITY_COOKIE ke environment variables.',
  );
}

// ─── Shared axios instance ke Roblox ─────────────────────────────────────────
const robloxHttp = axios.create({
  timeout: 6000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Origin': 'https://www.roblox.com',
    'Referer': 'https://www.roblox.com/',
    // Cookie disertakan jika tersedia — membuka akses penuh ke /v1/users/search
    ...(ROBLOX_COOKIE ? { Cookie: ROBLOX_COOKIE } : {}),
  },
});

// ─── Helper: fetch avatar untuk list userId ───────────────────────────────────
async function fetchAvatars(userIds: number[]): Promise<Map<number, string>> {
  if (userIds.length === 0) return new Map();
  try {
    const res = await robloxHttp.get(
      'https://thumbnails.roblox.com/v1/users/avatar-headshot',
      {
        params: {
          userIds: userIds.join(','),
          size: '48x48',
          format: 'Png',
          isCircular: false,
        },
      },
    );
    const items: Array<{ targetId: number; imageUrl: string; state: string }> =
      res.data?.data ?? [];
    return new Map(
      items
        .filter((t) => t.state === 'Completed' && t.imageUrl)
        .map((t) => [t.targetId, t.imageUrl]),
    );
  } catch {
    // Avatar gagal tidak perlu crash — tampilkan fallback saja
    return new Map();
  }
}

// ─── GET /api/roblox/search?q=... ────────────────────────────────────────────
//
// Strategi 2 endpoint paralel — ambil dari mana pun yang berhasil:
//
// Endpoint 1 → POST /v1/usernames/users
//   Lookup exact username. Tidak butuh auth. Paling reliable untuk
//   mencocokkan username yang sudah diketahui user.
//
// Endpoint 2 → GET /v1/users/search
//   Full-text search / autofill. Kadang butuh cookie, kadang tidak.
//   Kita coba tetap — kalau gagal, hasil Endpoint 1 sudah cukup.
//
// Hasil dari keduanya di-merge, duplikat dihapus berdasarkan userId.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    res.status(400).json({ error: 'Query minimal 2 karakter.' });
    return;
  }

  const keyword = q.trim();

  try {
    // Jalankan kedua endpoint secara paralel ─────────────────────────────────
    const [exactResult, searchResult] = await Promise.allSettled([
      // Endpoint 1: exact username lookup
      robloxHttp.post('https://users.roblox.com/v1/usernames/users', {
        usernames: [keyword],
        excludeBannedUsers: true,
      }),

      // Endpoint 2: full-text search (lebih "autofill-like")
      robloxHttp.get('https://users.roblox.com/v1/users/search', {
        params: { keyword, limit: 8 },
      }),
    ]);

    // Merge hasil, hindari duplikat berdasarkan userId ────────────────────────
    const userMap = new Map<number, { id: number; name: string; displayName: string }>();

    if (exactResult.status === 'fulfilled') {
      for (const u of exactResult.value.data?.data ?? []) {
        if (u.id && u.name) {
          userMap.set(u.id, {
            id: u.id,
            name: u.name,
            displayName: u.displayName ?? u.name,
          });
        }
      }
    } else {
      console.warn('[roblox/search] Endpoint exact gagal:', exactResult.reason?.message);
    }

    if (searchResult.status === 'fulfilled') {
      for (const u of searchResult.value.data?.data ?? []) {
        if (u.id && u.name && !userMap.has(u.id)) {
          userMap.set(u.id, {
            id: u.id,
            name: u.name,
            displayName: u.displayName ?? u.name,
          });
        }
      }
    } else {
      console.warn('[roblox/search] Endpoint search gagal:', searchResult.reason?.message);
    }

    const users = Array.from(userMap.values()).slice(0, 8);

    if (users.length === 0) {
      res.json({ users: [] });
      return;
    }

    // Fetch avatar semua user sekaligus ──────────────────────────────────────
    const avatarMap = await fetchAvatars(users.map((u) => u.id));

    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        displayName: u.displayName,
        avatarUrl: avatarMap.get(u.id) ?? null,
      })),
    });
  } catch (err: any) {
    console.error('[roblox/search] Unexpected error:', err.message);

    if (err.response?.status === 429) {
      res.status(429).json({ error: 'Rate limit Roblox. Tunggu sebentar lalu coba lagi.' });
      return;
    }

    res.status(502).json({ error: 'Gagal menghubungi Roblox API. Coba lagi.' });
  }
});

export default router;