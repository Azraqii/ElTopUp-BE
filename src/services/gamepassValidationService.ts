import axios from 'axios';
import { getCsrfToken, getGamepassProductInfo, getUserGames, getGameGamepasses, type UserGamepassInfo } from './robloxBotService';

export interface GamepassValidationResult {
  valid: boolean;
  gamepassId: string;
  gamepassName: string;
  price: number;
  userId: number;
  username: string;
}

export interface ScanGamepassResult {
  found: boolean;
  gamepass?: UserGamepassInfo;
  scannedGames: number;
  scannedGamepasses: number;
  userId: number;
  username: string;
  requiredPrice: number;
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

export async function findGamepassByPrice(
  username: string,
  targetPrice: number,
): Promise<ScanGamepassResult> {
  const robloxUser = await lookupRobloxUserId(username);

  const games = await getUserGames(robloxUser.userId);

  let scannedGamepasses = 0;

  for (const game of games) {
    const gamepasses = await getGameGamepasses(game.universeId);
    scannedGamepasses += gamepasses.length;

    for (const gp of gamepasses) {
      if (
        gp.sellerId === robloxUser.userId &&
        gp.price === targetPrice &&
        gp.isForSale
      ) {
        return {
          found: true,
          gamepass: {
            gamepassId: gp.gamepassId,
            name: gp.name,
            price: gp.price,
            isForSale: gp.isForSale,
            sellerId: gp.sellerId,
            gameName: game.name,
          },
          scannedGames: games.length,
          scannedGamepasses,
          userId: robloxUser.userId,
          username: robloxUser.username,
          requiredPrice: targetPrice,
        };
      }
    }
  }

  return {
    found: false,
    scannedGames: games.length,
    scannedGamepasses,
    userId: robloxUser.userId,
    username: robloxUser.username,
    requiredPrice: targetPrice,
  };
}

export async function validateGamepassForOrder(
  username: string,
  grossRobuxAmount: number,
): Promise<GamepassValidationResult> {
  const targetPrice = grossRobuxAmount;

  const scanResult = await findGamepassByPrice(username, targetPrice);

  if (!scanResult.found || !scanResult.gamepass) {
    throw new Error(
      `Gamepass dengan harga ${targetPrice} Robux tidak ditemukan di akun "${scanResult.username}". ` +
      `Pastikan kamu sudah membuat gamepass dengan harga ${targetPrice} Robux dan mengaktifkan penjualannya. ` +
      `(${scanResult.scannedGames} game, ${scanResult.scannedGamepasses} gamepass di-scan)`,
    );
  }

  const csrfToken = await getCsrfToken();
  const gpInfo = await getGamepassProductInfo(scanResult.gamepass.gamepassId, csrfToken);

  if (gpInfo.sellerId !== scanResult.userId) {
    throw new Error(
      'Gamepass ini bukan milik kamu. Pastikan gamepass dibuat oleh akun Roblox yang kamu masukkan.',
    );
  }

  if (gpInfo.price !== targetPrice) {
    throw new Error(
      `Harga Gamepass berubah sejak di-scan. Harga yang dibutuhkan: ${targetPrice} Robux, ` +
      `tapi gamepass sekarang memiliki harga ${gpInfo.price} Robux.`,
    );
  }

  if (!gpInfo.isForSale) {
    throw new Error(
      'Gamepass belum dijual (On Sale). Aktifkan penjualan gamepass di pengaturan Roblox terlebih dahulu.',
    );
  }

  return {
    valid: true,
    gamepassId: scanResult.gamepass.gamepassId,
    gamepassName: gpInfo.name,
    price: gpInfo.price,
    userId: scanResult.userId,
    username: scanResult.username,
  };
}
