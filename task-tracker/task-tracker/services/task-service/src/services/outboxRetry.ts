import { OutboxRepository } from '../models/outboxModel';
import { HttpClient } from '@task-tracker/shared';

const BACKOFF = [30000, 60000, 120000, 300000, 600000]; // 30s/60s/2min/5min/10min
const MAX_RETRIES = 5;

export function startOutboxRetryWorker(outboxRepo: OutboxRepository = new OutboxRepository()): void {
  const http = new HttpClient({
    timeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || '3000', 10),
    internalToken: process.env.INTERNAL_TOKEN,
  });

  setInterval(async () => {
    const pending = outboxRepo.findPending(10);
    for (const item of pending) {
      try {
        await http.request(item.target_url, {
          method: 'POST',
          body: JSON.parse(item.payload),
        });
        outboxRepo.markSent(item.id);
      } catch {
        if (item.retries >= MAX_RETRIES) {
          outboxRepo.markFailed(item.id);
        } else {
          const nextDelay = BACKOFF[Math.min(item.retries, BACKOFF.length - 1)];
          outboxRepo.incrementRetry(item.id, new Date(Date.now() + nextDelay).toISOString());
        }
      }
    }
  }, 30000); // 每 30s 扫描
}
