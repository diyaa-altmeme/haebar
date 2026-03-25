import { createClient } from "redis";

type CacheValue = {
  value: string;
  expiresAt: number;
};

const memoryStore = new Map<string, CacheValue>();
type RedisHandle = ReturnType<typeof createClient>;

let redisClient: RedisHandle | null = null;
let redisInitPromise: Promise<RedisHandle | null> | null = null;

async function getRedisClient() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (!redisInitPromise) {
    redisInitPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL
      });

      client.on("error", () => {
        redisClient = null;
      });

      await client.connect();
      redisClient = client;
      return client;
    })().catch(() => null);
  }

  return redisInitPromise;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  }

  const cached = memoryStore.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }

  return JSON.parse(cached.value) as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number) {
  const serialized = JSON.stringify(value);
  const redis = await getRedisClient();

  if (redis) {
    await redis.set(key, serialized, {
      EX: ttlSeconds
    });
    return;
  }

  memoryStore.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

export async function cacheRemember<T>(key: string, ttlSeconds: number, factory: () => Promise<T>) {
  const existing = await cacheGet<T>(key);
  if (existing !== null) {
    return existing;
  }

  const fresh = await factory();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

export async function invalidateCacheByPrefix(prefixes: string[]) {
  const redis = await getRedisClient();

  if (redis) {
    for (const prefix of prefixes) {
      const iterator = redis.scanIterator({
        MATCH: `${prefix}*`,
        COUNT: 100
      });

      for await (const key of iterator) {
        await redis.del(key);
      }
    }

    return;
  }

  for (const key of [...memoryStore.keys()]) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      memoryStore.delete(key);
    }
  }
}
