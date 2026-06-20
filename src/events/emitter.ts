import { EventEmitter } from 'events';
import type { EventMap, EventName } from './types';

// Type-safe event emitter singleton
// Usage: emitEvent("OrderCreated", { orderId, userId, ... })
// At scale (10K+ users), replace with Redis Pub/Sub

class TypedEventEmitter {
  private emitter = new EventEmitter();

  constructor() {
    // Increase max listeners for production (9 modules may each listen)
    this.emitter.setMaxListeners(20);
  }

  emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    const listenerCount = this.emitter.listenerCount(event);
    try {
      console.log(`[Event] ${event} (${listenerCount} listener${listenerCount === 1 ? '' : 's'})`, JSON.stringify(payload).slice(0, 200));
    } catch {
      console.log(`[Event] ${event} (payload not serializable)`);
    }
    // A real emit that reaches nobody means listeners and emit ended up on
    // different bus instances (the prod bundling/singleton bug). Surface it
    // loudly instead of silently dropping order notifications/side-effects.
    if (listenerCount === 0) {
      console.warn(`[Event] WARNING: "${event}" emitted with no listeners — side-effects (notifications, etc.) will NOT run.`);
    }
    this.emitter.emit(event, payload);
  }

  on<K extends EventName>(event: K, listener: (payload: EventMap[K]) => void): void {
    this.emitter.on(event, listener);
  }

  off<K extends EventName>(event: K, listener: (payload: EventMap[K]) => void): void {
    this.emitter.off(event, listener);
  }
}

// The event bus MUST be ONE instance shared across every server context in the
// Node process: listeners are registered once from instrumentation.ts, but
// `emitEvent` is called from API routes/services that Next.js bundles into
// separate module instances. Cache it on globalThis UNCONDITIONALLY — including
// production. The dev-only guard used by prisma/redis is WRONG here: for those a
// duplicate instance only wastes a connection, but a duplicate event emitter has
// NO listeners, so every production emit silently reaches nobody (this was the
// root cause of order SMS/email/in-app notifications never firing in prod).
const globalForEvents = globalThis as unknown as { eventBus?: TypedEventEmitter };

export const eventBus = globalForEvents.eventBus ?? new TypedEventEmitter();

globalForEvents.eventBus = eventBus;

// Convenience alias
export const emitEvent = eventBus.emit.bind(eventBus);
