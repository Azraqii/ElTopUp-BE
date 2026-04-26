import axios from 'axios';
import { getCsrfToken, getGamepassProductInfo, getUserGames, getGameGamepasses, type UserGamepassInfo } from './robloxBotService';
import { robuxshipValidateGamepass, isRobuxShipConfigured } from './robuxshipService';

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
  hint?: string;
  source?: 'roblox-api' | 'robuxship';
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
  let skippedGames = 0;

  for (const game of games) {
    let gamepasses: Awaited<ReturnType<typeof getGameGamepasses>>;
    try {
      gamepasses = await getGameGamepasses(game.universeId);
    } catch (err) {
      console.warn(`[findGamepassByPrice] Gagal fetch gamepass untuk game "${game.name}" (universeId ${game.universeId}): ${(err as Error).message}`);
      skippedGames++;
      continue;
    }
    scannedGamepasses += gamepasses.length;

    for (const gp of gamepasses) {
      if (gp.price === targetPrice && gp.isForSale) {
        let confirmedSellerId = gp.sellerId;

        // Jika sellerId tidak tersedia dari listing API (fallback endpoint),
        // verifikasi langsung via product-info endpoint
        if (confirmedSellerId === 0) {
          try {
            const csrfToken = await getCsrfToken();
            const gpInfo = await getGamepassProductInfo(gp.gamepassId, csrfToken);
            confirmedSellerId = gpInfo.sellerId;
          } catch {
            continue;
          }
        }

        if (confirmedSellerId === robloxUser.userId) {
          console.log(
            `[findGamepassByPrice] ✅ Ditemukan via Roblox API (scan langsung) — gamepassId: ${gp.gamepassId}, ` +
            `game: "${game.name}", harga: ${gp.price} Robux, user: "${robloxUser.username}" ` +
            `(${scannedGamepasses} gamepass di-scan dari ${games.length} game)`,
          );
          return {
            found: true,
            gamepass: {
              gamepassId: gp.gamepassId,
              name: gp.name,
              price: gp.price,
              isForSale: gp.isForSale,
              sellerId: confirmedSellerId,
              gameName: game.name,
            },
            scannedGames: games.length,
            scannedGamepasses,
            userId: robloxUser.userId,
            username: robloxUser.username,
            requiredPrice: targetPrice,
            source: 'roblox-api',
          };
        }
      }
    }
  }

  if (games.length === 0) {
    throw new Error(
      `Tidak ditemukan game yang dibuat oleh "${robloxUser.username}" (userId: ${robloxUser.userId}). ` +
      `Pastikan kamu sudah membuat game/experience di Roblox dan game tersebut berstatus publik, ` +
      `lalu buat gamepass dengan harga ${targetPrice} Robux di game tersebut.`,
    );
  }

  // Fallback: pakai RobuxShip validate untuk menemukan gamepass
  // (berguna jika game unrated sehingga Roblox API menyembunyikan gamepass)
  if (isRobuxShipConfigured()) {
    console.log(`[findGamepassByPrice] Scan langsung gagal (${scannedGamepasses} gamepass). Mencoba fallback RobuxShip validate...`);
    const rsResult = await robuxshipValidateGamepass(robloxUser.username, targetPrice);

    if (rsResult && rsResult.gamepass_id) {
      const gamepassId = String(rsResult.gamepass_id);

      let gpName = `Gamepass #${gamepassId}`;
      let gpPrice = rsResult.price;
      let gpIsForSale = true;
      let gpSellerId = rsResult.user_id;

      try {
        const csrfToken = await getCsrfToken();
        const gpInfo = await getGamepassProductInfo(gamepassId, csrfToken);
        gpName = gpInfo.name;
        gpPrice = gpInfo.price;
        gpIsForSale = gpInfo.isForSale;
        gpSellerId = gpInfo.sellerId;
      } catch {
        // Data dari RobuxShip sudah cukup
      }

      if (gpSellerId === robloxUser.userId && gpPrice === targetPrice && gpIsForSale) {
        console.log(
          `[findGamepassByPrice] ✅ Ditemukan via RobuxShip fallback — gamepassId: ${gamepassId}, ` +
          `harga: ${gpPrice} Robux, user: "${robloxUser.username}" ` +
          `(Roblox API scan gagal: ${scannedGamepasses} gamepass di-scan dari ${games.length} game)`,
        );
        return {
          found: true,
          gamepass: {
            gamepassId,
            name: gpName,
            price: gpPrice,
            isForSale: gpIsForSale,
            sellerId: gpSellerId,
            gameName: rsResult.universe_id ? `Universe ${rsResult.universe_id}` : 'Unknown',
          },
          scannedGames: games.length,
          scannedGamepasses: scannedGamepasses + 1,
          userId: robloxUser.userId,
          username: robloxUser.username,
          requiredPrice: targetPrice,
          source: 'robuxship',
        };
      }
    }
  }

  let hint: string | undefined;
  if (games.length > 0 && scannedGamepasses === 0) {
    hint =
      'Game ditemukan tapi tidak ada gamepass yang terdeteksi. ' +
      'Kemungkinan game kamu belum memiliki Experience Guidelines (rating). ' +
      'Buka Creator Dashboard → game kamu → Configure → pilih "Experience Guidelines" → isi kuesionernya. ' +
      'Setelah game di-rate, gamepass akan terlihat oleh sistem.';
  } else if (scannedGamepasses > 0) {
    hint =
      `Ditemukan ${scannedGamepasses} gamepass, tapi tidak ada yang cocok dengan harga ${targetPrice} Robux. ` +
      `Pastikan gamepass kamu berharga tepat ${targetPrice} Robux dan statusnya On Sale.`;
  }

  return {
    found: false,
    scannedGames: games.length,
    scannedGamepasses,
    userId: robloxUser.userId,
    username: robloxUser.username,
    requiredPrice: targetPrice,
    hint,
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

  console.log(
    `[validateGamepassForOrder] Validasi berhasil via ${scanResult.source === 'robuxship' ? 'RobuxShip' : 'Roblox API'} — ` +
    `gamepassId: ${scanResult.gamepass.gamepassId}, nama: "${gpInfo.name}", ` +
    `harga: ${gpInfo.price} Robux, user: "${scanResult.username}"`,
  );

  return {
    valid: true,
    gamepassId: scanResult.gamepass.gamepassId,
    gamepassName: gpInfo.name,
    price: gpInfo.price,
    userId: scanResult.userId,
    username: scanResult.username,
  };
}
