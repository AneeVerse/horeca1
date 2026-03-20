import { Queue, Worker, type Processor } from 'bullmq';
import IORedis from 'ioredis';

// BullMQ needs its own Redis connection (separate from our app's Redis)
// WHY: BullMQ bundles its own ioredis version which can conflict with ours
// Using a fresh connection avoids TypeScript version mismatch errors
function getQueueConnection() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  return new IORedis(url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });
}

// Create a queue with standard options
export function createQueue(name: string) {
  return new Queue(name, {
    connection: getQueueConnection() as never, // Type cast needed due to ioredis version mismatch
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
    connection: getQueueConnection() as never,
    concurrency,
  });
}

// Queue names (centralized to avoid typos)
export const QUEUE_NAMES = {
  NOTIFICATION: 'notification',
  INVOICE: 'invoice',
  RECONCILIATION: 'reconciliation',
} as const;
