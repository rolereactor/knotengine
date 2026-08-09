import { Redis } from "ioredis";
import { childLogger } from "./logger.js";

const logger = childLogger("redis");

/**
 * 🔴 Redis Client
 *
 * Singleton Redis connection for distributed caching and session management.
 * Provides graceful degradation if Redis is unavailable.
 */
export class RedisClient {
  private static instance: Redis | null = null;
  private static isConnected = false;
  private static reconnectTimer: NodeJS.Timeout | null = null;
  private static readonly RECONNECT_INTERVAL_MS = 30_000;

  /**
   * Gets or creates the Redis client instance.
   * Uses lazy initialization to avoid connection errors during startup.
   */
  public static getInstance(): Redis | null {
    if (!this.instance) {
      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl) {
        logger.warn("⚠️ REDIS_URL not set. Redis caching disabled.");
        return null;
      }

      try {
        this.instance = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) {
              logger.warn(
                "❌ Redis retry limit reached, switching to periodic reconnection",
              );
              RedisClient.startPeriodicReconnect();
              return null; // Stop ioredis auto-retry; we handle reconnection ourselves
            }
            return Math.min(times * 50, 2000); // Exponential backoff
          },
          enableOfflineQueue: true,
          enableReadyCheck: true,
          keepAlive: 30000,
          connectTimeout: 5000,
          commandTimeout: 2000,
          lazyConnect: false,
        });

        this.instance.on("connect", () => {
          logger.info("✅ Redis connected");
          this.isConnected = true;
        });

        this.instance.on("error", (err: Error) => {
          logger.error({ message: err.message }, "❌ Redis error");
          this.isConnected = false;
        });

        this.instance.on("close", () => {
          logger.warn("⚠️ Redis connection closed");
          this.isConnected = false;
        });

        this.instance.on("reconnecting", () => {
          logger.info("🔄 Redis reconnecting...");
        });

        this.instance.on("ready", () => {
          logger.info("🔴 Redis ready for commands");
        });
      } catch (err) {
        logger.error({ err }, "❌ Failed to initialize Redis");
        this.instance = null;
      }
    }

    return this.instance;
  }

  /**
   * Starts periodic reconnection attempts after initial retries are exhausted.
   * Attempts to reconnect every RECONNECT_INTERVAL_MS until successful.
   */
  private static startPeriodicReconnect(): void {
    if (this.reconnectTimer) return; // Already running

    logger.info(
      { intervalMs: this.RECONNECT_INTERVAL_MS },
      "🔄 Starting periodic Redis reconnection",
    );

    this.reconnectTimer = setInterval(async () => {
      if (this.isConnected) {
        RedisClient.stopPeriodicReconnect();
        return;
      }

      logger.info("🔄 Periodic Redis reconnection attempt...");

      try {
        // Destroy the old broken instance
        if (this.instance) {
          this.instance.removeAllListeners();
          this.instance.disconnect();
          this.instance = null;
        }

        // Create a fresh connection (getInstance will create a new one)
        const redis = RedisClient.getInstance();
        if (redis) {
          await redis.ping();
          logger.info("✅ Redis reconnected via periodic attempt");
          RedisClient.stopPeriodicReconnect();
        }
      } catch (err) {
        logger.debug({ err }, "⏳ Periodic reconnection attempt failed");
      }
    }, this.RECONNECT_INTERVAL_MS);
  }

  /**
   * Stops periodic reconnection attempts.
   */
  private static stopPeriodicReconnect(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
      logger.info("✅ Periodic reconnection stopped");
    }
  }

  /**
   * Tests the Redis connection.
   * Returns true if Redis is reachable.
   */
  public static async testConnection(): Promise<boolean> {
    const redis = this.getInstance();
    if (!redis) return false;

    try {
      await redis.ping();
      return true;
    } catch (err) {
      logger.error({ err }, "❌ Redis ping failed");
      return false;
    }
  }

  /**
   * Checks if Redis is connected and ready.
   */
  public static isReady(): boolean {
    return this.instance !== null && this.isConnected;
  }

  /**
   * Gracefully shuts down the Redis connection.
   */
  public static async disconnect(): Promise<void> {
    RedisClient.stopPeriodicReconnect();

    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      this.isConnected = false;
      logger.info("🔴 Redis disconnected");
    }
  }

  /**
   * Gets a value from Redis cache.
   * Returns null if Redis is unavailable or key doesn't exist.
   */
  public static async get<T = string>(key: string): Promise<T | null> {
    const redis = this.getInstance();
    if (!redis) return null;

    try {
      const value = await redis.get(key);
      if (value === null) return null;

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (err) {
      logger.warn({ key, err }, "Redis GET failed");
      return null;
    }
  }

  /**
   * Sets a value in Redis cache with optional TTL.
   * Returns true if successful, false if Redis is unavailable.
   */
  public static async set<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<boolean> {
    const redis = this.getInstance();
    if (!redis) return false;

    try {
      const serialized =
        typeof value === "string" ? value : JSON.stringify(value);

      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (err) {
      logger.warn({ key, err }, "Redis SET failed");
      return false;
    }
  }

  /**
   * Deletes a key from Redis cache.
   */
  public static async del(key: string): Promise<boolean> {
    const redis = this.getInstance();
    if (!redis) return false;

    try {
      await redis.del(key);
      return true;
    } catch (err) {
      logger.warn({ key, err }, "Redis DEL failed");
      return false;
    }
  }

  /**
   * Gets multiple values from Redis cache.
   */
  public static async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
    const redis = this.getInstance();
    if (!redis) return keys.map(() => null);

    try {
      const values = await redis.mget(...keys);
      return values.map((value) => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      });
    } catch (err) {
      logger.warn({ err }, "Redis MGET failed");
      return keys.map(() => null);
    }
  }
}
