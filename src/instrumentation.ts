/**
 * Next.js Instrumentation Hook
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This file is automatically loaded by Next.js on server startup.
 * The `register` function runs once when a new Next.js server instance is created.
 */
export async function register() {
  // Only register event listeners on the Node.js server runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerEventListeners } = await import('@/events/listeners');
    registerEventListeners();
  }
}
