import { Queue, Worker, type Processor } from 'bullmq';
import { redis } from '@/lib/redis';

const connection = redis;

// Create a queue with standard options
export function createQueue(name: string) {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  });
}

// Create a worker for a queue
export function createWorker<T>(
  name: string,
  processor: Processor<T>,
  concurrency = 5
) {
  return new Worker<T>(name, processor, {
    connection,
    concurrency,
  });
}

// Queue names (centralized to avoid typos)
export const QUEUE_NAMES = {
  NOTIFICATION: 'notification',
  INVOICE: 'invoice',
  RECONCILIATION: 'reconciliation',
} as const;
