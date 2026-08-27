import { MemoryRateLimitStorage, RedisRateLimitStorage } from './rate-limit.storage';

describe('RateLimitStorage', () => {
  describe('MemoryRateLimitStorage', () => {
    it('allows requests under the limit', async () => {
      const storage = new MemoryRateLimitStorage();
      const allowed = await storage.isAllowed('key-1', 3, 1000);
      expect(allowed).toBe(true);
    });

    it('blocks requests over the limit within the window', async () => {
      const storage = new MemoryRateLimitStorage();
      await storage.isAllowed('key-2', 2, 1000);
      await storage.isAllowed('key-2', 2, 1000);
      const allowed = await storage.isAllowed('key-2', 2, 1000);
      expect(allowed).toBe(false);
    });
  });

  describe('RedisRateLimitStorage', () => {
    it('falls back to memory when ioredis is not available', async () => {
      const storage = new RedisRateLimitStorage('redis://localhost:6379');
      const allowed = await storage.isAllowed('key-3', 2, 1000);
      expect(allowed).toBe(true);
    });
  });
});
