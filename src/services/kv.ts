// Redis-backed key/value with in-memory fallback for local dev.
import Redis from 'ioredis';
import { cfg } from '../config';

const redis = cfg.redisUrl ? new Redis(cfg.redisUrl) : null;
const mem = new Map<string, number>();

/** Returns true only the first time `key` is set within `ttlSec` (idempotency / throttling). */
export async function setOnce(key: string, ttlSec: number): Promise<boolean> {
  if (redis) return (await redis.set(key, '1', 'EX', ttlSec, 'NX')) === 'OK';
  const now = Date.now();
  if ((mem.get(key) ?? 0) > now) return false;
  mem.set(key, now + ttlSec * 1000);
  return true;
}
