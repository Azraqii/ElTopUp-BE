import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getRobloxConfig = (csrfToken?: string) => {
  const cookie = process.env.ROBLOX_COOKIE;
  if (!cookie) throw new Error("ROBLOX_COOKIE missing");

  const headers: any = {
    'Cookie': `.ROBLOSECURITY=${cookie}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://www.roblox.com',
    'Referer': 'https://www.roblox.com/'
  };

  if (csrfToken) {
    headers['X-CSRF-TOKEN'] = csrfToken;
  }

  return { headers };
};

const getCsrfToken = async (): Promise<string> => {
  try {
    await axios.post('https://auth.roblox.com/v2/logout', {}, getRobloxConfig());
    return "";
  } catch (error: any) {
    if (error.response && error.response.headers['x-csrf-token']) {
      return error.response.headers['x-csrf-token'];
    }
    console.error("❌ Gagal ambil CSRF:", error.message);
    throw new Error("Gagal mendapatkan CSRF Token. Cek Cookie.");
  }
};

const getProductInfo = async (gamepassId: string, csrfToken: string) => {
    const cleanId = gamepassId.toString().trim();

    console.log(`   👉 Mencari Info Produk untuk ID: ${cleanId}...`);

    const productUrl = `https://apis.roblox.com/game-passes/v1/game-passes/${cleanId}/product-info`;

    try {
        const res = await axios.get(productUrl, getRobloxConfig(csrfToken));
        const data = res.data;

        console.log("   📦 RAW DATA:", JSON.stringify(data, null, 2));

        const productId = data.productId ?? data.ProductId;
        const price = data.priceInRobux ?? data.PriceInRobux;
        const sellerId = data.creatorId ?? data.Creator?.CreatorTargetId ?? data.creatorTargetId;
        const name = data.name ?? data.Name;
        const isForSale = data.isForSale ?? data.IsForSale;

        if (!productId) {
            throw new Error("Product ID tidak ditemukan dalam respons API");
        }

        return {
            productId: productId,
            price: price,
            sellerId: sellerId,
            name: name,
            isForSale: isForSale
        };

    } catch (error: any) {
        console.error(`   ❌ API Error: ${error.message}`);
        if (error.response?.data) {
            console.error("   Response:", JSON.stringify(error.response.data));
        }

        console.log(`   ⚠️ Mencoba fallback ke Economy API...`);
        try {
            const econUrl = `https://economy.roblox.com/v1/game-passes/${cleanId}/game-pass-product-info`;
            const econRes = await axios.get(econUrl, getRobloxConfig(csrfToken));
            const data = econRes.data;

            return {
                productId: data.ProductId,
                price: data.PriceInRobux,
                sellerId: data.Creator?.CreatorTargetId,
                name: data.Name,
                isForSale: data.IsForSale
            };
        } catch (econErr: any) {
            console.error(`   ❌ Economy API juga gagal: ${econErr.message}`);
            throw new Error(`Gagal mendapatkan info produk untuk ID ${cleanId}.`);
        }
    }
};

export const purchaseGamepass = async (gamepassId: string, expectedPrice: number) => {
  console.log(`\n🤖 BOT: Memulai pembelian Gamepass ID ${gamepassId}...`);

  try {
    const csrfToken = await getCsrfToken();
    console.log(`   🔑 CSRF Token: ${csrfToken.substring(0, 20)}...`);

    await sleep(500);

    const info = await getProductInfo(gamepassId, csrfToken);

    console.log(`   📦 Barang: "${info.name}"`);
    console.log(`   🏷️  Product ID: ${info.productId}`);
    console.log(`   👤 Seller ID: ${info.sellerId}`);
    console.log(`   💰 Harga: ${info.price} Robux`);

    if (!info.isForSale) {
        throw new Error("Gamepass sedang TIDAK DIJUAL (OffSale)");
    }

    if (info.price !== expectedPrice) {
        console.log(`   ⚠️ PERINGATAN: Harga berbeda! Target: ${expectedPrice}, Aktual: ${info.price}`);
    }

    const buyUrl = `https://economy.roblox.com/v1/purchases/products/${info.productId}`;

    const payload = {
        expectedCurrency: 1,
        expectedPrice: info.price,
        expectedSellerId: info.sellerId
    };

    console.log(`   🛒 Mengirim request pembelian...`);
    const buyRes = await axios.post(buyUrl, payload, getRobloxConfig(csrfToken));
    const result = buyRes.data;

    console.log("   📋 Response:", JSON.stringify(result, null, 2));

    if (result.purchased === true) {
        console.log(`   ✅ SUKSES! Transaksi berhasil.`);
        return { success: true, data: result };
    } else if (result.reason === "AlreadyOwned") {
        console.log(`   ⚠️ Item sudah dimiliki. Anggap sukses.`);
        return { success: true, message: "Already Owned", data: result };
    } else {
        console.log(`   ❌ GAGAL: ${result.reason || 'Unknown'}`);
        throw new Error(`Pembelian ditolak: ${result.reason || JSON.stringify(result)}`);
    }

  } catch (error: any) {
    console.error(`   ❌ BOT ERROR: ${error.message}`);
    if (error.response?.data) {
        console.error("   Detail Response:", JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status === 403) {
        console.error("   🔒 Error 403: Cookie mungkin invalid atau tidak punya permission.");
    }
    return { success: false, error: error.message, details: error.response?.data };
  }
};
