import { Redis } from "@upstash/redis";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const redisEnabled = Boolean(
  UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN,
);

const redis = redisEnabled
  ? new Redis({
      url: UPSTASH_REDIS_REST_URL as string,
      token: UPSTASH_REDIS_REST_TOKEN as string,
    })
  : null;

let hasWarned = false;

const warnOnce = (error: unknown) => {
  if (hasWarned) return;
  hasWarned = true;
  console.warn("Redis unavailable, continuing without cache", error);
};

export const initializeRedis = async () => {
  if (!redis) return;

  try {
    await redis.ping();
  } catch (error) {
    warnOnce(error);
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!redis) return null;

  try {
    const raw = await redis.get<unknown>(key);
    if (!raw) return null;

    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as T;
      }
    }

    return raw as T;
  } catch (error) {
    warnOnce(error);
    return null;
  }
};

export const setCache = async <T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> => {
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    warnOnce(error);
    return;
  }
};

export const getOrSetCache = async <T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> => {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;

  const fresh = await loader();
  await setCache(key, fresh, ttlSeconds);
  return fresh;
};

export const deleteCacheByPrefix = async (prefix: string): Promise<void> => {
  if (!redis) return;

  try {
    let cursor = "0";

    do {
      const scanResult = (await redis.scan(cursor, {
        match: `${prefix}*`,
        count: 200,
      })) as [string, string[]];

      cursor = scanResult[0];
      const keys = scanResult[1] || [];

      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    warnOnce(error);
    return;
  }
};
