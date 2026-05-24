import { Currency } from "@qodinger/knot-types";
import { RedisClient } from "./redis-client.js";
import { LRUCache } from "lru-cache";

interface PriceData {
  [currency: string]: {
    usd: number;
  };
}

export class PriceOracle {
  private static CACHE_TTL_SECONDS = 60; // 1 minute cache
  private static CACHE_KEY_PREFIX = "price:";

  /**
   * Local LRU cache for fallback when Redis is unavailable.
   * Bounded to prevent memory leaks.
   */
  private static localCache = new LRUCache<string, number>({
    max: 100, // Max 100 entries
    ttl: 60 * 1000, // 1 minute TTL
    maxSize: 1024 * 1024, // Max 1MB memory
    sizeCalculation: (value) => JSON.stringify(value).length,
  });

  /**
   * Fetches the current price of a cryptocurrency in USD.
   * Primary: Redis distributed cache
   * Secondary: CoinGecko API
   * Tertiary (Failover): Binance API
   * Last Resort: Local LRU cache (stale allowed)
   */
  public static async getPrice(currency: Currency): Promise<number> {
    const coinId = this.mapCurrencyToCoinGeckoId(currency);
    const cacheKey = `${this.CACHE_KEY_PREFIX}${coinId}`;

    // 1. Try Redis distributed cache
    try {
      const redis = RedisClient.getInstance();
      if (redis) {
        const cachedPrice = await RedisClient.get<number>(cacheKey);
        if (cachedPrice !== null && cachedPrice > 0) {
          // Also update local cache
          this.localCache.set(coinId, cachedPrice);
          return cachedPrice;
        }
      }
    } catch (err) {
      console.warn("Redis cache read failed, using fallback:", err);
    }

    // 2. Try local LRU cache
    const localCached = this.localCache.get(coinId);
    if (localCached) {
      console.log(
        `📊 Returning local cache price for ${coinId}: $${localCached}`,
      );
      return localCached;
    }

    // 3. Fetch new price with Failover Logic
    try {
      // Try Source 1: CoinGecko
      const price = await this.fetchFromCoinGecko(coinId);
      await this.updateCache(cacheKey, coinId, price);
      return price;
    } catch (geckoError) {
      console.warn("CoinGecko failed, falling back to Binance...", geckoError);

      try {
        // Try Source 2: Binance
        const binancePrice = await this.fetchFromBinance(currency, coinId);
        await this.updateCache(cacheKey, coinId, binancePrice);
        return binancePrice;
      } catch (binanceError) {
        console.error("Binance also failed:", binanceError);

        // Final Fallback: Return stale local cache if available
        const stalePrice = this.localCache.get(coinId);
        if (stalePrice) {
          console.warn("⚠️ Returning stale price as last resort:", stalePrice);
          return stalePrice;
        }

        throw new Error(
          "Critical: All price feed providers are currently unavailable.",
        );
      }
    }
  }

  private static async fetchFromCoinGecko(coinId: string): Promise<number> {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API Error: ${response.statusText}`);
    }

    const data = (await response.json()) as PriceData;
    const price = data[coinId]?.usd;

    if (!price) {
      throw new Error(`Price not found for ${coinId} on CoinGecko`);
    }

    return price;
  }

  private static async fetchFromBinance(
    currency: Currency,
    _coinId: string,
  ): Promise<number> {
    const symbol = this.mapCurrencyToBinanceSymbol(currency);
    if (!symbol)
      throw new Error(`Currency ${currency} not supported on Binance`);

    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
    );

    if (!response.ok) {
      throw new Error(`Binance API Error: ${response.statusText}`);
    }

    const data = (await response.json()) as { symbol: string; price: string };
    const price = parseFloat(data.price);

    if (isNaN(price) || price <= 0) {
      throw new Error(`Invalid price received from Binance: ${data.price}`);
    }

    return price;
  }

  private static async updateCache(
    cacheKey: string,
    coinId: string,
    price: number,
  ): Promise<void> {
    // Update Redis cache
    try {
      await RedisClient.set(cacheKey, price, this.CACHE_TTL_SECONDS);
    } catch (err) {
      console.warn("Redis cache write failed:", err);
    }

    // Update local LRU cache
    this.localCache.set(coinId, price);
  }

  private static mapCurrencyToCoinGeckoId(currency: Currency): string {
    switch (currency) {
      case "BTC":
        return "bitcoin";
      case "LTC":
        return "litecoin";
      case "ETH":
        return "ethereum";
      case "USDT_ERC20":
      case "USDT_POLYGON":
        return "tether";
      case "USDC_ERC20":
      case "USDC_POLYGON":
        return "usd-coin";
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  private static mapCurrencyToBinanceSymbol(currency: Currency): string | null {
    switch (currency) {
      case "BTC":
        return "BTCUSDT";
      case "LTC":
        return "LTCUSDT";
      case "ETH":
        return "ETHUSDT";
      case "USDT_ERC20":
      case "USDT_POLYGON":
        return null; // No USDT/USDT pair on Binance; CoinGecko handles stablecoins
      case "USDC_ERC20":
      case "USDC_POLYGON":
        return "USDCUSDT";
      default:
        return null;
    }
  }

  /**
   * Clears all cached prices (useful for testing or manual refresh).
   */
  public static async clearCache(): Promise<void> {
    this.localCache.clear();

    try {
      const redis = RedisClient.getInstance();
      if (redis) {
        const keys = await redis.keys(`${this.CACHE_KEY_PREFIX}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (err) {
      console.warn("Failed to clear Redis cache:", err);
    }
  }
}
