import axios, { AxiosError } from 'axios';
import { prisma } from '../lib/prisma';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBotCookie(): Promise<string> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'ROBLOX_BOT_COOKIE' },
  });

  if (!config || !config.value) {
    throw new Error('Bot cookie belum dikonfigurasi. Isi melalui dashboard admin.');
  }

  return config.value;
}

function buildHeaders(cookie: string, csrfToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Cookie: `.ROBLOSECURITY=${cookie}`,
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/json',
    Origin: 'https://www.roblox.com',
    Referer: 'https://www.roblox.com/',
  };
  if (csrfToken) {
    headers['X-CSRF-TOKEN'] = csrfToken;
  }
  return headers;
}

export async function getCsrfToken(): Promise<string> {
  const cookie = await getBotCookie();

  try {
    await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: buildHeaders(cookie),
    });
  } catch (err) {
    const axiosErr = err as AxiosError;
    const csrfToken = axiosErr.response?.headers?.['x-csrf-token'];
    if (csrfToken) {
      return csrfToken;
    }
    throw new Error('Gagal mendapatkan CSRF token dari Roblox. Pastikan cookie bot valid.');
  }

  throw new Error('Gagal mendapatkan CSRF token: respons tidak mengandung header x-csrf-token.');
}

export interface GamepassProductInfo {
  productId: number;
  price: number;
  sellerId: number;
  name: string;
  isForSale: boolean;
}

export async function getGamepassProductInfo(
  gamepassId: string,
  csrfToken: string,
): Promise<GamepassProductInfo> {
  const cookie = await getBotCookie();
  const headers = buildHeaders(cookie, csrfToken);

  try {
    const res = await axios.get(
      `https://apis.roblox.com/game-passes/v1/game-passes/${gamepassId}/product-info`,
      { headers },
    );
    const data = res.data;
    return {
      productId: data.ProductId ?? data.productId,
      price: data.PriceInRobux ?? data.priceInRobux ?? 0,
      sellerId: data.Creator?.Id ?? data.creator?.id ?? 0,
      name: data.Name ?? data.name ?? '',
      isForSale: data.IsForSale ?? data.isForSale ?? false,
    };
  } catch {
    // Fallback ke endpoint lama
  }

  try {
    const res = await axios.get(
      `https://economy.roblox.com/v1/game-passes/${gamepassId}/game-pass-product-info`,
      { headers },
    );
    const data = res.data;
    return {
      productId: data.ProductId ?? data.productId,
      price: data.PriceInRobux ?? data.priceInRobux ?? 0,
      sellerId: data.Creator?.Id ?? data.creator?.id ?? 0,
      name: data.Name ?? data.name ?? '',
      isForSale: data.IsForSale ?? data.isForSale ?? false,
    };
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    if (status === 404) {
      throw new Error(`Gamepass dengan ID ${gamepassId} tidak ditemukan.`);
    }
    throw new Error(`Gagal mengambil info gamepass: ${axiosErr.message}`);
  }
}

export interface PurchaseResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export async function purchaseGamepass(
  gamepassId: string,
  expectedPrice: number,
): Promise<PurchaseResult> {
  try {
    const csrfToken = await getCsrfToken();
    const gpInfo = await getGamepassProductInfo(gamepassId, csrfToken);

    await sleep(500);

    const cookie = await getBotCookie();
    const headers = buildHeaders(cookie, csrfToken);

    const res = await axios.post(
      `https://economy.roblox.com/v1/purchases/products/${gpInfo.productId}`,
      {
        expectedCurrency: 1,
        expectedPrice,
        expectedSellerId: gpInfo.sellerId,
      },
      { headers },
    );

    const data = res.data;

    if (data.purchased || data.success) {
      return { success: true, data };
    }

    if (data.reason === 'AlreadyOwned') {
      return { success: true, message: 'Gamepass sudah dimiliki bot (AlreadyOwned)', data };
    }

    return {
      success: false,
      message: data.errorMsg || data.reason || 'Pembelian gagal tanpa pesan error spesifik.',
      data,
    };
  } catch (err) {
    const axiosErr = err as AxiosError;
    const responseData = axiosErr.response?.data as Record<string, unknown> | undefined;
    const status = axiosErr.response?.status;

    if (status === 403) {
      throw new Error('Cookie bot tidak valid atau sudah expired. Perbarui melalui dashboard admin.');
    }
    if (status === 429) {
      throw new Error('Rate limit Roblox tercapai. Coba lagi dalam beberapa menit.');
    }

    throw new Error(
      `Gagal membeli gamepass: ${responseData?.message || responseData?.errorMsg || axiosErr.message}`,
    );
  }
}

export interface ValidateOwnershipResult {
  valid: boolean;
  name: string;
  price: number;
  isForSale: boolean;
}

export async function validateGamepassOwnership(
  gamepassId: string,
  robloxUserId: number,
): Promise<ValidateOwnershipResult> {
  const csrfToken = await getCsrfToken();
  const gpInfo = await getGamepassProductInfo(gamepassId, csrfToken);

  return {
    valid: gpInfo.sellerId === robloxUserId,
    name: gpInfo.name,
    price: gpInfo.price,
    isForSale: gpInfo.isForSale,
  };
}

export interface UserGamepassInfo {
  gamepassId: string;
  name: string;
  price: number;
  isForSale: boolean;
  sellerId: number;
  gameName: string;
}

export async function getUserGames(userId: number): Promise<{ universeId: number; name: string }[]> {
  const cookie = await getBotCookie();
  const headers: Record<string, string> = {
    Cookie: `.ROBLOSECURITY=${cookie}`,
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };

  const games: { universeId: number; name: string }[] = [];
  let cursor: string | null = null;

  try {
    while (true) {
      const urlStr = `https://games.roblox.com/v2/users/${userId}/games?sortOrder=Desc&limit=50&accessFilter=2${cursor ? `&cursor=${cursor}` : ''}`;
      const response = await axios.get(urlStr, { headers });
      const body = response.data as { data?: { id: number; name: string }[]; nextPageCursor?: string };

      if (body.data) {
        for (const game of body.data) {
          games.push({ universeId: game.id, name: game.name });
        }
      }

      cursor = body.nextPageCursor || null;
      if (!cursor) break;
      await sleep(300);
    }
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    if (status === 404 || status === 403 || status === 400) {
      console.warn(`[getUserGames] Roblox API returned ${status} for userId ${userId}, returning ${games.length} game(s) yang sudah di-fetch`);
      return games;
    }
    throw new Error(`Gagal mengambil daftar game untuk userId ${userId}: ${(err as Error).message}`);
  }

  return games;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGamepassEntry(gp: any): { gamepassId: string; name: string; price: number; isForSale: boolean; sellerId: number } {
  const price =
    gp.price?.robux ??
    gp.price ??
    gp.PriceInRobux ??
    gp.priceInRobux ??
    0;
  const resolvedPrice = typeof price === 'object' ? 0 : price;
  return {
    gamepassId: String(gp.id || gp.gamePassId || gp.Id),
    name: gp.name || gp.displayName || gp.Name || '',
    price: resolvedPrice,
    isForSale: gp.isForSale ?? gp.IsForSale ?? (resolvedPrice > 0),
    sellerId: gp.sellerId ?? gp.seller?.id ?? gp.Creator?.Id ?? gp.creator?.id ?? gp.creatorId ?? 0,
  };
}

export async function getGameGamepasses(
  universeId: number,
): Promise<{ gamepassId: string; name: string; price: number; isForSale: boolean; sellerId: number }[]> {
  const cookie = await getBotCookie();
  const headers: Record<string, string> = {
    Cookie: `.ROBLOSECURITY=${cookie}`,
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };

  type GamepassEntry = { gamepassId: string; name: string; price: number; isForSale: boolean; sellerId: number };
  let gamepasses: GamepassEntry[] = [];

  // Endpoint utama: games.roblox.com (publik, tapi tidak return gamepass untuk game unrated)
  let cursor: string | null = null;
  try {
    while (true) {
      const urlStr = `https://games.roblox.com/v1/games/${universeId}/game-passes?sortOrder=Desc&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
      const response = await axios.get(urlStr, { headers });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = response.data as { data?: any[]; nextPageCursor?: string };

      if (body.data) {
        for (const gp of body.data) {
          gamepasses.push(parseGamepassEntry(gp));
        }
      }

      cursor = body.nextPageCursor || null;
      if (!cursor) break;
      await sleep(300);
    }
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    if (status !== 404 && status !== 403) {
      throw new Error(`Gagal mengambil gamepass untuk universeId ${universeId}: ${(err as Error).message}`);
    }
    console.warn(`[getGameGamepasses] Primary endpoint returned ${status} for universeId ${universeId}`);
  }

  if (gamepasses.length > 0) return gamepasses;

  // Fallback 1: apis.roblox.com — endpoint Creator Dashboard, bisa akses gamepass meskipun game unrated
  try {
    const res = await axios.get(
      `https://apis.roblox.com/game-passes/v1/game-passes?isArchived=false&universeId=${universeId}&limit=100`,
      { headers },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = res.data?.data || res.data?.gamePassList || [];
    if (items.length > 0) {
      gamepasses = items.map(parseGamepassEntry);
      console.log(`[getGameGamepasses] Fallback 1 (apis.roblox.com) returned ${gamepasses.length} gamepass(es) for universeId ${universeId}`);
      return gamepasses;
    }
  } catch (err) {
    console.warn(`[getGameGamepasses] Fallback 1 (apis.roblox.com) failed for universeId ${universeId}: ${(err as Error).message}`);
  }

  // Fallback 2: develop.roblox.com — development API
  try {
    const res = await axios.get(
      `https://develop.roblox.com/v1/universes/${universeId}/game-passes?page=1&limit=50&sortOrder=Asc`,
      { headers },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = res.data?.data || [];
    if (items.length > 0) {
      gamepasses = items.map(parseGamepassEntry);
      console.log(`[getGameGamepasses] Fallback 2 (develop.roblox.com) returned ${gamepasses.length} gamepass(es) for universeId ${universeId}`);
      return gamepasses;
    }
  } catch (err) {
    console.warn(`[getGameGamepasses] Fallback 2 (develop.roblox.com) failed for universeId ${universeId}: ${(err as Error).message}`);
  }

  // Fallback 3: apis.roblox.com universes endpoint dengan passView=Full dan pageToken pagination
  try {
    let pageToken: string | null = null;
    while (true) {
      const url = `https://apis.roblox.com/game-passes/v1/universes/${universeId}/game-passes?passView=Full&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const response = await axios.get(url, { headers });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = response.data as { gamePasses?: any[]; nextPageToken?: string };

      if (body.gamePasses) {
        for (const gp of body.gamePasses) {
          gamepasses.push(parseGamepassEntry(gp));
        }
      }

      pageToken = body.nextPageToken || null;
      if (!pageToken) break;
      await sleep(300);
    }

    if (gamepasses.length > 0) {
      console.log(`[getGameGamepasses] Fallback 3 (universes game-passes) returned ${gamepasses.length} gamepass(es) for universeId ${universeId}`);
      return gamepasses;
    }
  } catch (err) {
    console.warn(`[getGameGamepasses] Fallback 3 (universes game-passes) failed for universeId ${universeId}: ${(err as Error).message}`);
  }

  return gamepasses;
}

export async function getBotRobuxBalance(): Promise<number> {
  const cookie = await getBotCookie();
  const headers = buildHeaders(cookie);
  headers['Accept'] = 'application/json';

  const res = await axios.get('https://economy.roblox.com/v1/user/currency', { headers });
  return res.data?.robux ?? 0;
}

export async function ensureBotCookieConfig(): Promise<void> {
  const existing = await prisma.systemConfig.findUnique({
    where: { key: 'ROBLOX_BOT_COOKIE' },
  });

  if (!existing) {
    await prisma.systemConfig.create({
      data: {
        key: 'ROBLOX_BOT_COOKIE',
        value: '',
        description: 'Cookie .ROBLOSECURITY untuk akun bot Roblox',
      },
    });
    console.warn('⚠️  [BOT] SystemConfig ROBLOX_BOT_COOKIE dibuat dengan value kosong. Isi melalui dashboard admin.');
  } else if (!existing.value) {
    console.warn('⚠️  [BOT] ROBLOX_BOT_COOKIE kosong. Bot tidak dapat memproses order ROBUX sampai cookie diisi.');
  }
}
