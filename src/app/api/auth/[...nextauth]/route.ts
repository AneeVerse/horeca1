// Auth.js catch-all route handler
// WHY: Auth.js v5 needs this to handle login, logout, session, and callback URLs
// It auto-handles: POST /api/auth/signin, GET /api/auth/session, POST /api/auth/signout, etc.
// We don't write any logic here — Auth.js does it all based on src/auth.ts config

import { handlers } from '@/auth';

export const { GET, POST } = handlers;
