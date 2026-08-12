import { Redis } from 'ioredis';

const valkeyUrl = process.env.VALKEY_URL || 'redis://127.0.0.1:6379/2';

export const valkey = new Redis(valkeyUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

valkey.on('error', (err) => {
  console.error('[Valkey Error]:', err.message);
});

valkey.on('connect', () => {
  console.log('⚡ Connected to Valkey / Redis (DB 2)');
});

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await valkey.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`[Valkey Get Error] Key: ${key}:`, err);
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const data = JSON.stringify(value);
    await valkey.setex(key, ttlSeconds, data);
  } catch (err) {
    console.error(`[Valkey Set Error] Key: ${key}:`, err);
  }
}
