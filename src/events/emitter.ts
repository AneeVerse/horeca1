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
    try {
      console.log(`[Event] ${event}`, JSON.stringify(payload).slice(0, 200));
    } catch {
      console.log(`[Event] ${event} (payload not serializable)`);
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

const globalForEvents = globalThis as unknown as { eventBus: TypedEventEmitter };

export const eventBus = globalForEvents.eventBus ?? new TypedEventEmitter();

if (process.env.NODE_ENV !== 'production') globalForEvents.eventBus = eventBus;

// Convenience alias
export const emitEvent = eventBus.emit.bind(eventBus);
