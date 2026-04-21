import axios from 'axios';
import { getCsrfToken, getGamepassProductInfo } from './robloxBotService';

export interface GamepassValidationResult {
  valid: boolean;
  gamepassId: string;
  gamepassName: string;
  price: number;
  userId: number;
  username: string;
}

function extractGamepassId(gamepassLink: string): string {
  if (/^\d+$/.test(gamepassLink.trim())) {
    return gamepassLink.trim();
  }

  const patterns = [
    /game-pass\/(\d+)/i,
    /gamepass\/(\d+)/i,
    /id=(\d+)/i,
    /\/(\d+)\//,
  ];

  for (const pattern of patterns) {
    const match = gamepassLink.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  throw new Error('Format link gamepass tidak valid. Gunakan link Roblox atau ID gamepass langsung.');
}

async function lookupRobloxUserId(username: string): Promise<{ userId: number; username: string }> {
  try {
    const res = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: [username],
      excludeBannedUsers: true,
    });

    const users = res.data?.data;
    if (!users || users.length === 0) {
      throw new Error(`Username Roblox "${username}" tidak ditemukan.`);
    }

    return {
      userId: users[0].id,
      username: users[0].name,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('tidak ditemukan')) {
      throw err;
    }
    throw new Error(`Gagal mencari username Roblox: ${(err as Error).message}`);
  }
}

export async function validateGamepassForOrder(
  username: string,
  nominalIdr: number,
  gamepassLink: string,
): Promise<GamepassValidationResult> {
  const gamepassId = extractGamepassId(gamepassLink);

  const robloxUser = await lookupRobloxUserId(username);

  const csrfToken = await getCsrfToken();
  const gpInfo = await getGamepassProductInfo(gamepassId, csrfToken);

  const targetPrice = Math.ceil(nominalIdr / 0.7);

  if (gpInfo.sellerId !== robloxUser.userId) {
    throw new Error(
      'Gamepass ini bukan milik kamu. Pastikan gamepass dibuat oleh akun Roblox yang kamu masukkan.',
    );
  }

  if (gpInfo.price !== targetPrice) {
    throw new Error(
      `Harga Gamepass tidak sesuai. Harga yang dibutuhkan: ${targetPrice} Robux, ` +
      `tapi gamepass kamu memiliki harga ${gpInfo.price} Robux.`,
    );
  }

  if (!gpInfo.isForSale) {
    throw new Error(
      'Gamepass belum dijual (On Sale). Aktifkan penjualan gamepass di pengaturan Roblox terlebih dahulu.',
    );
  }

  return {
    valid: true,
    gamepassId,
    gamepassName: gpInfo.name,
    price: gpInfo.price,
    userId: robloxUser.userId,
    username: robloxUser.username,
  };
}
