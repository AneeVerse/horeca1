# Horeca1 — Part 3: Folder Structure, Integration, Security, Deployment, Scalability, Testing

## 7. Backend Folder Structure (Next.js API + Services + Workers)

```
horeca1/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth/
│   │   │       │   ├── signup/route.ts
│   │   │       │   ├── login/route.ts
│   │   │       │   ├── otp/request/route.ts
│   │   │       │   ├── otp/verify/route.ts
│   │   │       │   ├── refresh/route.ts
│   │   │       │   ├── logout/route.ts
│   │   │       │   ├── password/reset/route.ts
│   │   │       │   ├── password/update/route.ts
│   │   │       │   └── me/route.ts
│   │   │       ├── vendors/
│   │   │       │   ├── route.ts              # GET list, POST create
│   │   │       │   ├── my-vendors/route.ts
│   │   │       │   ├── [id]/
│   │   │       │   │   ├── route.ts           # GET detail, PUT update
│   │   │       │   │   ├── products/route.ts
│   │   │       │   │   └── follow/route.ts
│   │   │       ├── products/
│   │   │       │   ├── route.ts               # POST create
│   │   │       │   ├── search/route.ts
│   │   │       │   └── [id]/route.ts          # PUT, DELETE
│   │   │       ├── categories/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       ├── route.ts
│   │   │       │       └── vendors/route.ts
│   │   │       ├── inventory/
│   │   │       │   ├── check/route.ts
│   │   │       │   └── [productId]/route.ts
│   │   │       ├── orders/
│   │   │       │   ├── route.ts               # GET list, POST create PO
│   │   │       │   ├── [id]/
│   │   │       │   │   ├── route.ts
│   │   │       │   │   ├── status/route.ts
│   │   │       │   │   └── save-as-list/route.ts
│   │   │       │   └── reorder/[id]/route.ts
│   │   │       ├── cart/
│   │   │       │   ├── route.ts               # GET, DELETE
│   │   │       │   ├── items/
│   │   │       │   │   ├── route.ts           # POST add
│   │   │       │   │   └── [itemId]/route.ts  # PUT, DELETE
│   │   │       │   └── checkout/route.ts
│   │   │       ├── lists/
│   │   │       │   ├── route.ts               # GET all, POST create
│   │   │       │   └── [id]/
│   │   │       │       ├── route.ts           # GET, PUT, DELETE
│   │   │       │       ├── items/
│   │   │       │       │   ├── route.ts       # POST add item
│   │   │       │       │   └── [itemId]/route.ts
│   │   │       │       └── order/route.ts
│   │   │       ├── payments/
│   │   │       │   ├── initiate/route.ts
│   │   │       │   ├── verify/route.ts
│   │   │       │   └── [orderId]/route.ts
│   │   │       ├── credit/
│   │   │       │   ├── check/route.ts
│   │   │       │   ├── apply/route.ts
│   │   │       │   ├── signup/route.ts
│   │   │       │   ├── transactions/route.ts
│   │   │       │   └── [accountId]/approve/route.ts
│   │   │       ├── notifications/
│   │   │       │   ├── route.ts
│   │   │       │   ├── [id]/read/route.ts
│   │   │       │   └── read-all/route.ts
│   │   │       ├── serviceability/
│   │   │       │   └── check/route.ts
│   │   │       └── admin/
│   │   │           ├── users/route.ts
│   │   │           ├── vendors/route.ts
│   │   │           ├── orders/route.ts
│   │   │           ├── dashboard/route.ts
│   │   │           ├── collections/route.ts
│   │   │           └── categories/route.ts
│   │   └── (frontend pages)/ ...
│   ├── lib/
│   │   ├── prisma.ts                # Singleton Prisma client
│   │   ├── supabase/
│   │   │   ├── server.ts            # Supabase server client
│   │   │   └── admin.ts             # Supabase service-role client
│   │   ├── redis.ts                 # Upstash Redis client
│   │   ├── razorpay.ts              # Razorpay SDK instance
│   │   ├── imagekit.ts              # ImageKit SDK instance
│   │   ├── sentry.ts                # Sentry init
│   │   └── validators/              # Zod schemas per module
│   │       ├── auth.ts
│   │       ├── vendor.ts
│   │       ├── product.ts
│   │       ├── order.ts
│   │       ├── cart.ts
│   │       ├── list.ts
│   │       ├── payment.ts
│   │       └── credit.ts
│   ├── services/                    # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── vendor.service.ts
│   │   ├── catalog.service.ts
│   │   ├── inventory.service.ts
│   │   ├── order.service.ts
│   │   ├── cart.service.ts
│   │   ├── list.service.ts
│   │   ├── payment.service.ts
│   │   ├── credit.service.ts
│   │   ├── notification.service.ts
│   │   └── search.service.ts
│   ├── events/
│   │   ├── emitter.ts               # EventEmitter singleton
│   │   ├── types.ts                 # Event type definitions
│   │   └── listeners/
│   │       ├── order.listener.ts
│   │       ├── payment.listener.ts
│   │       ├── inventory.listener.ts
│   │       ├── notification.listener.ts
│   │       └── credit.listener.ts
│   ├── workers/                     # BullMQ workers
│   │   ├── notification.worker.ts
│   │   ├── invoice.worker.ts
│   │   └── reconciliation.worker.ts
│   ├── queues/
│   │   ├── notification.queue.ts
│   │   ├── invoice.queue.ts
│   │   └── reconciliation.queue.ts
│   ├── middleware/
│   │   ├── auth.ts                  # JWT/session validation
│   │   ├── rbac.ts                  # Role-based access control
│   │   ├── rateLimit.ts             # Rate limiting
│   │   └── errorHandler.ts          # Global error handler
│   └── types/
│       ├── api.ts                   # Request/response types
│       ├── events.ts
│       └── enums.ts
├── tests/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── vendor.test.ts
│   │   ├── order.test.ts
│   │   └── payment.test.ts
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   └── fixtures/
│       ├── users.json
│       ├── vendors.json
│       └── products.json
├── .env.local
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 8. Backend → Frontend Integration (Key Flow Call Chains)

### Flow 1: Vendor Store Page Load
```
Page: /vendors/[slug]
  → GET /api/v1/vendors/:id            → VendorService.getBySlug()  → vendors, delivery_slots, service_areas
  → GET /api/v1/vendors/:id/products   → CatalogService.getVendorProducts() → products, price_slabs, inventory
  → GET /api/v1/credit/check?vendor_id → CreditService.check()     → credit_accounts
  ← JSON: vendor header + product grid + credit info
```

### Flow 2: Search (FTS + pgvector)
```
Page: /search?q=tomato+ketchup
  → GET /api/v1/products/search?q=&pincode=
  → SearchService.search(query, pincode)
    → PostgreSQL: to_tsvector/to_tsquery for FTS
    → pgvector: embedding similarity for semantic matches
    → JOIN vendors ON service_areas.pincode = user_pincode
  ← JSON: { products[], vendors[], categories[] }  (3 blocks per UI-UX p5)
```

### Flow 3: Create PO (multi-vendor checkout)
```
Page: /cart → checkout
  → POST /api/v1/cart/checkout
  → OrderService.createFromCart(userId)
    → CartService.getCart(userId) → cart_items
    → InventoryService.bulkCheck(items) → inventory
    → Validate MOV per vendor
    → Prisma transaction: INSERT orders, order_items per vendor; DELETE cart_items
    → EventEmitter.emit('OrderCreated', { orders })
      → InventoryListener: reserve stock
      → NotificationListener: queue SMS/email
      → PaymentListener: create Razorpay orders
    → PaymentService.createRazorpayOrders(orders)
  ← JSON: { orders[], payment_details[] }
```

### Flow 4: Quick Order List → Checkout (30-second flow)
```
Page: /lists/:id → order
  → GET /api/v1/lists/:id → ListService.getWithProducts() → list_items, products, inventory
  → POST /api/v1/lists/:id/order { items with quantities }
    → CartService.addFromList(items)
    → redirect → POST /api/v1/cart/checkout (same as Flow 3)
```

### Flow 5: Razorpay Payment Webhook
```
Razorpay server → POST /api/v1/payments/verify
  → PaymentService.verifyWebhook(req)
    → Verify razorpay_signature using HMAC-SHA256
    → UPDATE payments SET status='captured'
    → UPDATE orders SET payment_status='paid'
    → EventEmitter.emit('PaymentReceived', { order_id, payment_id })
      → NotificationListener: send confirmation to customer + vendor
      → InvoiceWorker: queue invoice PDF generation
      → CreditListener: if credit used, record transaction
  ← 200 OK
```

---

## 9. Authentication & Security

### 9.1 Auth Flow (Supabase Auth)
1. **Signup:** Client → `POST /api/v1/auth/signup` → Supabase `auth.signUp()` → creates auth user → API creates `users` row with role → returns JWT + refresh token.
2. **Login (email/password):** Client → `POST /api/v1/auth/login` → Supabase `auth.signInWithPassword()` → returns JWT.
3. **Login (OTP):** Client → `POST /api/v1/auth/otp/request` → Supabase sends OTP via SMS → Client → `POST /api/v1/auth/otp/verify` → returns JWT.
4. **Session:** JWT stored in httpOnly cookie (server-side) or Authorization header (API calls). Refresh token rotated on each use.
5. **Password reset:** Supabase `auth.resetPasswordForEmail()` → email link → `PUT /api/v1/auth/password/update`.

### 9.2 JWT / Session Handling
- JWT issued by Supabase Auth, contains `sub` (user UUID), `role`, `exp`.
- Middleware extracts JWT from `Authorization: Bearer` header or cookie.
- `src/middleware/auth.ts` validates JWT via `supabase.auth.getUser(token)`.
- Sets `app.current_user_id` and `app.current_user_role` on PostgreSQL session for RLS.

### 9.3 Row-Level Security (RLS)
- Every multi-tenant table has RLS enabled.
- Policies use `current_setting('app.current_user_id')` and `current_setting('app.current_user_role')`.
- Before each Prisma query, execute: `SET LOCAL app.current_user_id = 'uuid'; SET LOCAL app.current_user_role = 'customer';`
- Admin role bypasses all RLS via admin policies.

### 9.4 RBAC (Role-Based Access Control)

| Endpoint Category | customer | vendor | admin |
|---|---|---|---|
| Auth (login/signup/me) | ✅ | ✅ | ✅ |
| Vendors (read) | ✅ | ✅ | ✅ |
| Vendors (write own) | ❌ | ✅ | ✅ |
| Products (read) | ✅ | ✅ | ✅ |
| Products (write) | ❌ | ✅ (own) | ✅ |
| Cart | ✅ | ❌ | ❌ |
| Orders (create) | ✅ | ❌ | ❌ |
| Orders (view own) | ✅ | ✅ | ✅ |
| Orders (update status) | ❌ | ✅ (own) | ✅ |
| Quick Order Lists | ✅ | ❌ | ❌ |
| Payments | ✅ | ✅ (view) | ✅ |
| Credit (check/apply) | ✅ | ❌ | ❌ |
| Credit (approve) | ❌ | ✅ (own) | ✅ |
| Inventory (write) | ❌ | ✅ (own) | ✅ |
| Admin endpoints | ❌ | ❌ | ✅ |
| Notifications | ✅ | ✅ | ✅ |

### 9.5 Security Measures
- **CSRF:** Not applicable for API-only (JWT auth). For SSR forms, use Supabase PKCE flow.
- **CORS:** Restrict to `horeca1.com` and `*.horeca1.com`. No wildcard in production.
- **Rate Limiting:** Upstash Redis-based (see §C.6 below).
- **Input Validation:** Zod schemas in `src/lib/validators/` for every endpoint.
- **SQL Injection:** Prisma parameterized queries (no raw SQL without `$queryRaw` with template literals).
- **Secrets Management:** Environment variables via Vercel, never committed. `.env.example` with placeholder keys.
- **Headers:** `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: DENY`.

---

## 10. Deployment Architecture & CI/CD

### 10.1 Infrastructure Map
```
Vercel (Next.js deployment)
  ├── Serverless Functions → API Routes
  ├── Edge Network → Static assets + SSR
  └── Preview Deployments → PR branches

Supabase (Managed PostgreSQL)
  ├── Database → PostgreSQL 15+
  ├── Auth → Supabase Auth
  ├── Realtime → WebSocket subscriptions
  └── Storage → (optional, prefer ImageKit)

Upstash Redis
  ├── BullMQ Queues → notification, invoice, reconciliation
  └── Cache → search results, vendor data

ImageKit → Product/vendor image CDN
Razorpay → Payment processing
Sentry → Error monitoring + performance
```

### 10.2 Environment Variables
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# ImageKit
IMAGEKIT_PUBLIC_KEY=public_xxx
IMAGEKIT_PRIVATE_KEY=private_xxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/horeca1

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# App
NEXT_PUBLIC_APP_URL=https://horeca1.com
```

### 10.3 CI/CD (Vercel)
1. **Push to `main`** → Vercel auto-deploys to production.
2. **Push to PR branch** → Vercel creates preview deployment.
3. **Pre-deploy:** Run `npx prisma migrate deploy` via Vercel build command.
4. **Post-deploy:** Sentry release + source maps upload.

### 10.4 DB Migrations & Rollback
- **Migrations:** `npx prisma migrate dev` (dev), `npx prisma migrate deploy` (prod).
- **Rollback:** `npx prisma migrate resolve --rolled-back <migration_name>` + manual SQL if needed.
- **Backups:** Supabase Pro includes daily backups + point-in-time recovery.

---

## 11. Scalability & Performance

### 11.1 Indexing Strategy
- All FK columns indexed.
- GIN index on `products.search_vector` for FTS.
- IVFFlat index on `products.embedding` for pgvector.
- Partial indexes on `is_active = true` for products, vendors.
- Composite indexes: `(vendor_id, category_id)` on products, `(user_id, vendor_id)` on customer_vendors.

### 11.2 Caching (Redis)
| Cache Key Pattern | TTL | Invalidation |
|---|---|---|
| `vendor:{id}` | 5 min | On vendor update |
| `vendor:{id}:products:{cursor}` | 2 min | On product CRUD |
| `categories:all` | 10 min | On category update |
| `search:{hash(query+pincode)}` | 1 min | TTL-based |
| `serviceability:{pincode}` | 30 min | On service_area update |

### 11.3 Queue Architecture (BullMQ + Upstash Redis)
| Queue | Job Type | Retry | Backoff | Concurrency |
|---|---|---|---|---|
| `notification` | SMS, email, WhatsApp, push | 3 | Exponential (1s, 4s, 16s) | 10 |
| `invoice` | PDF generation | 2 | Linear (5s) | 5 |
| `reconciliation` | Payment settlement check | 3 | Exponential | 2 |

### 11.4 Event-Driven Listeners
| Event | Listeners |
|---|---|
| `OrderCreated` | InventoryListener (reserve stock), NotificationListener (queue SMS), PaymentListener (create Razorpay order) |
| `OrderConfirmed` | NotificationListener (confirm to customer) |
| `PaymentReceived` | OrderListener (update status), NotificationListener (receipt), InvoiceWorker (queue PDF), CreditListener (record txn) |
| `PaymentFailed` | NotificationListener (alert customer), InventoryListener (release stock) |
| `StockUpdated` | NotificationListener (low stock alert to vendor) |
| `CreditApplied` | NotificationListener (credit usage alert), CreditListener (log txn) |

### 11.5 Scaling Notes
- **Vercel serverless** scales automatically (no server management).
- **Supabase compute add-ons** for DB at 50K+ users.
- **Connection pooling:** Supabase pgBouncer + Prisma `connection_limit` in DATABASE_URL.
- **Redis Pub/Sub** replaces in-app EventEmitter at 10K+ users.
- **Image optimization:** ImageKit handles CDN + transformations (no server load).

---

## 12. Testing & Migration Plan

### 12.1 Prisma Migrations
```bash
# Development
npx prisma migrate dev --name init_schema

# Production deploy
npx prisma migrate deploy

# Reset dev DB
npx prisma migrate reset
```

### 12.2 Seed Data Plan
```bash
npx prisma db seed
```
Seed script (`prisma/seed.ts`) creates:
- 1 admin user
- 3 sample vendors (Dairy Direct, Grocery Hub, Spice World) with service areas
- 10 categories with subcategories
- 30 products across vendors with price slabs + inventory
- 2 sample customers with Quick Order Lists
- 5 sample orders with order items
- 1 collection (Oriental Kitchen)

### 12.3 Integration Test Approach
- **Framework:** Vitest + Supertest
- **DB:** Separate test database (Supabase local via Docker or test project)
- **Strategy:** Each test file seeds its own data, tests endpoints, cleans up.
- **Key test suites:**

| Suite | Tests |
|---|---|
| Auth | Signup, login, OTP, refresh, password reset, invalid credentials |
| Vendor | List by pincode, store detail, CRUD (vendor role), follow/unfollow |
| Catalog | Search FTS, category listing, product CRUD, price slabs |
| Cart | Add/remove items, vendor grouping, MOV validation, checkout |
| Orders | Create PO, reorder, status update, save as list |
| Lists | CRUD lists, add/remove items, order from list |
| Payments | Initiate, webhook verify, signature validation |
| Credit | Check, apply, signup, approve |
| RBAC | Verify role restrictions on every endpoint |

### 12.4 API Testing
- Postman collection (see Deliverable B.6) with environment variables.
- Pre-request scripts for auth token refresh.
- Test scripts for response validation.

---

## 13. Implementation Checklist (Prioritized)

### 🟢 MVP (Phase 1 — 0–500 users, ₹0/mo infra)
1. Project setup: Next.js + Prisma + Supabase + TypeScript
2. Database schema: all tables, RLS policies, seed data
3. Auth module: signup, login, OTP, JWT middleware, RBAC
4. Vendor module: list, detail, products, service areas
5. Catalog module: categories, products, search (FTS)
6. Cart module: add/remove/update, vendor grouping, MOV check
7. Order module: create PO, order history, status
8. Payment module: Razorpay initiate + verify webhook
9. Basic notification (email only) via event listeners
10. Quick Order Lists: CRUD, order from list
11. Serviceability check (pincode)

### 🟡 Phase 2 — Launch (500–5K users, ~₹4,675–₹6,885/mo)
1. Credit (DiSCCO) module: check, apply, signup, approve
2. Reorder flow: reorder endpoint, save order as list
3. pgvector semantic search integration
4. BullMQ background jobs: notifications, invoice PDF
5. My Vendors: follow/unfollow, vendor history
6. Collections (curated homepage sections)
7. Delivery slots: schedule awareness
8. SMS/WhatsApp notifications (MSG91/Twilio)
9. Admin panel endpoints: dashboard, user/vendor management
10. Sentry integration: error + performance monitoring
11. Redis caching for hot paths

### 🔴 Phase 3 — Growth (5K–50K users, ~₹25,075/mo)
1. Wallet module: balance, top-up, pay from wallet
2. Redis Pub/Sub for event bus (replace EventEmitter)
3. Advanced analytics: GMV, retention, vendor performance
4. Vendor store customization APIs
5. Bulk import/export (products, orders)
6. Advanced credit risk scoring
7. Rate limiting refinement
8. Performance optimization: query tuning, connection pooling
9. Horizontal scaling: Vercel Pro multiple seats, Supabase compute add-ons
10. Load testing + chaos engineering

---

## Optional Improvements (not in source docs)
- **Real-time order tracking** via Supabase Realtime subscriptions
- **AI-powered "smart reorder"** — predict next order based on past frequency
- **Multi-language support** (i18n) for vendor stores
- **Vendor mobile app** (React Native) sharing same API
- **GraphQL layer** (optional, for complex frontend queries)
- **Audit log table** for compliance and dispute resolution
