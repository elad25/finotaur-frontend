// lib/cache/webhook-cache.ts
import { LRUCache } from 'lru-cache';

interface WebhookSecret {
  secret: string;
  userId: string;
  validUntil: number;
}

// Cache webhook secrets for 5 minutes
const webhookCache = new LRUCache<string, WebhookSecret>({
  max: 10000, // Support 10k active users
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
});

export const WebhookCache = {
  get: (userId: string) => webhookCache.get(userId),
  set: (userId: string, secret: string) => {
    webhookCache.set(userId, {
      secret,
      userId,
      validUntil: Date.now() + 300000,
    });
  },
  delete: (userId: string) => webhookCache.delete(userId),
};