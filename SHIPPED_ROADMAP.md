# Horeca1 — Shipped Features ✅

_Updated: 2026-04-29. Complete list of implemented and verified features._

---

## Core Platform Features

| Phase | Feature | Status | Commit |
|-------|---------|--------|--------|
| 1 | **UX Wiring** — 3 bulk price slabs, per-PO checkout, vendor approvals, order-list shortcuts, MOV enforcement | ✅ Shipped | `60a1b7f` |
| 2 | **Catalog & Delivery** — Multi-category support, delivery-slot picker, MOV, OOS alternates, pincode service-area gate | ✅ Shipped | `35b56cb` |
| 3 | **Notifications** — BullMQ worker, email + SMS providers, event bus, `/api/v1/health` | ✅ Shipped | `c1d1c92` |
| 4.2 | **Profile Completion** — "Complete your profile" nudge + flag tracking | ✅ Shipped | `3fc88bb` |
| 4.4 | **Homepage & Search Polish** — Real deals feed, honest vendor cards, search UX improvements | ✅ Shipped | `27080f5` |
| 5.1 | **Service Layer** — Business logic extracted to `src/modules/` (auth, catalog, cart, order, payment, etc.) | ✅ Shipped | pre-existing |
| 5.2 | **Event Bus** — Singleton emitter at `src/events/emitter.ts`, enqueues BullMQ jobs for async workflows | ✅ Shipped | `c1d1c92` |
| 5.3 | **Multi-Tenancy Enforcement** — `resolveVendorContext` / `resolveBrandContext` helpers, 403 on scope violation | ✅ Shipped | pre-existing |
| 5.4 | **Rate Limiting** — Redis-backed ZSET sliding window + in-memory circuit breaker; per-role tier caps | ✅ Shipped | `bb64e96` |
| 5.5 | **Audit Log** — `AuditLog` model, fire-and-forget `logAction()`, admin routes wired, before/after diffs | ✅ Shipped | `bb64e96` |

---

## Payment & Financial

| Feature | Status | Commit |
|---------|--------|--------|
| **Razorpay Integration** — Payment initiation, webhook listener (`POST /api/v1/payments/webhook`), HMAC verification, `payment.captured` / `payment.failed` handlers | ✅ Shipped | `14e7771` |
| **Razorpay Webhook Amount Verification** — Rejects if amount doesn't match stored order; prevents tampering | ✅ Shipped | `6780ba3` |
| **Returns & Refunds** — Customer request UI, admin approve/reject/refund flow, Razorpay refund calls, atomic transaction with inventory release | ✅ Shipped | `14e7771` + `6780ba3` |
| **Refund Atomicity** — Admin "Refund" calls `razorpay.payments.refund()`, stores refund ID, flips `Payment.status='refunded'` + `Order.paymentStatus='refunded'` in same transaction | ✅ Shipped | `6780ba3` |

---

## Orders & Inventory

| Feature | Status | Commit |
|---------|--------|--------|
| **Order Confirmation Email** — Event bus emits `order.created`, worker sends to customer + vendor via Resend | ✅ Shipped | `e244774` |
| **Order Status Tracking** — Lifecycle: `draft → pending → confirmed → processing → out_for_delivery → delivered`; customer notified on each transition | ✅ Shipped | `14e7771` |
| **Order Cancellation with Stock Release** — `releaseStock()` runs atomically; `OrderCancelled` event emitted | ✅ Shipped | `6780ba3` |
| **Invoice PDF (GST-Compliant)** — Generated via pdfkit, `GET /api/v1/orders/[id]/invoice`, downloadable from order detail page | ✅ Shipped | `14e7771` |
| **N+1 Inventory Optimization** — `inventory.bulkCheck()` uses single `findMany({ in: ids })` with Map lookup | ✅ Shipped | `6cf5a7c` |

---

## Catalog & Products

| Feature | Status | Commit |
|---------|--------|--------|
| **Multi-Category Support** — Products linked via primary `categoryId` + `ProductCategory` join table | ✅ Shipped | `35b56cb` |
| **Search with Typo Tolerance** — `pg_trgm` fuzzy matching (typo tolerance) + exact-match filtering; case-insensitive ILIKE | ✅ Shipped | `5586a0d` |
| **Brand Dropdown** — Vendor product create/edit uses `<datalist>` populated from `/api/v1/brands`; browser-native autocomplete | ✅ Shipped | `14e7771` |
| **Image Optimization** — 22 `<img>` → Next.js `<Image>` across Hero, Navbar, TopVendors, RecommendedCategories, checkout, category, vendor portal | ✅ Shipped | `14e7771` + `d34cb93` |

---

## Vendor Features

| Feature | Status | Commit |
|---------|--------|--------|
| **Vendor Document Upload** — `VendorDocument` model, upload UI in vendor settings (GST, registration, license) | ✅ Shipped | `14e7771` |
| **Admin Vendor Verification UI** — Admin vendor detail page with document verification flow (approve/reject) | ✅ Shipped | `d34cb93` |
| **Vendor Portal** — Dashboard with inventory, orders, products, settings; team RBAC (owner/manager/editor/viewer) | ✅ Shipped | pre-existing |
| **Vendor Order Management** — View orders, mark as processing/shipped, track customer notifications | ✅ Shipped | `14e7771` |
| **Vendor Reports** — Real revenue data, top products, lost sales from OOS; actual Prisma aggregation (not hardcoded) | ✅ Shipped | pre-existing |
| **Quick Order Lists** — Full CRUD + reorder; templates scoped per vendor or cross-vendor | ✅ Shipped | pre-existing |

---

## Admin Features

| Feature | Status | Commit |
|---------|--------|--------|
| **Vendor Approval Workflow** — Admin dashboard with vendor list, document verification, approve/reject | ✅ Shipped | `d34cb93` |
| **Order Management** — Admin view all orders, status transitions, refund approvals | ✅ Shipped | `14e7771` |
| **Returns Review** — Admin Returns page with customer request review, approve/reject/refund flow | ✅ Shipped | `14e7771` |
| **Product & Category Approval** — Admin manage categories, approve/reject new products | ✅ Shipped | pre-existing |
| **Finance Dashboard** — Order totals, payment status, refund tracking | ✅ Shipped | pre-existing |
| **Team Management** — Add team members with role-based permissions (owner/manager/editor/viewer) | ✅ Shipped | pre-existing |
| **Audit Trail** — See who changed what and when; append-only log with before/after diffs | ✅ Shipped | `bb64e96` |

---

## Security & Data Integrity

| Feature | Status | Commit |
|---------|--------|--------|
| **Auth.js v5 JWT** — Session management, RBAC, multi-profile linking via `LinkedAccount` | ✅ Shipped | pre-existing |
| **OTP Rate-Limit (TOCTOU-Safe)** — Count + invalidate + create in `Serializable` isolation transaction; 429 on conflict | ✅ Shipped | `3418571` |
| **Webhook Idempotency** — `WebhookEvent` model deduplicates by `${event}:${entityId}`; prevents duplicate order creation | ✅ Shipped | `6cf5a7c` |
| **Rate Limiting (Selective)** — Applied to: OTP send, file upload, Razorpay webhook, admin user create; extensible with `withRateLimit()` helper | ✅ Shipped | `6cf5a7c` |
| **User Soft Delete** — `isActive=false` instead of hard delete; preserves vendor/order/audit links | ✅ Shipped | `3418571` |
| **Timezone-Safe Cutoff Check** — Uses `Intl.DateTimeFormat({ timeZone: 'Asia/Kolkata' })` instead of Node's local tz | ✅ Shipped | `3418571` |
| **Cart Guest→Login Merge** — New `POST /api/v1/cart/merge`; CartContext sends localStorage items before server fetch | ✅ Shipped | `6cf5a7c` |

---

## Notifications

| Feature | Status | Commit |
|---------|--------|--------|
| **Email (Resend)** — API key live in prod + local; sends to `team.horeca1@gmail.com` until domain SPF/DKIM verified | ✅ Shipped | `e244774` |
| **SMS (MSG91)** — MSG91 API key live in prod; text messages sent on order events | ✅ Shipped | pre-existing |
| **WhatsApp (Stubbed)** — Code fully wired, MSG91 endpoint correct, env vars defined; waiting on Meta/MSG91 business approval | ✅ Code Ready | `85f3faf` |
| **BullMQ Worker** — Runs as `horeca1-worker` Docker container alongside app; consumes `notification` queue | ✅ Shipped | `e244774` |
| **In-App Notifications** — `Notification` model with status (pending/sent/failed) | ✅ Shipped | pre-existing |

---

## Infrastructure & Monitoring

| Feature | Status | Details |
|---------|--------|---------|
| **Sentry Error Tracking** — DSN live in `.env.production`; errors reach Sentry dashboard | ✅ Shipped | pre-existing |
| **Database Backups** — Script at `/opt/horeca1/backup.sh`, tested (44KB compressed), 7-day retention, cron ready | ✅ Ready | manual |
| **Deployment Automation** — SSH + bash deploy script: pulls master, rebuilds Docker, runs `prisma migrate deploy`, restarts app + nginx, health check (~5 min) | ✅ Shipped | pre-existing |
| **Docker Compose** — app + postgres + redis + nginx (production-ready on DigitalOcean droplet) | ✅ Shipped | pre-existing |
| **Health Check Endpoint** — `GET /api/v1/health` for uptime monitoring | ✅ Shipped | `c1d1c92` |

---

## Customer Features (Verified Working)

| Feature | Status |
|---------|--------|
| Browse & search products | ✅ Working |
| Vendor-grouped smart cart | ✅ Working |
| 3-tier bulk price slabs | ✅ Working |
| Delivery slot booking | ✅ Working |
| Order status tracking | ✅ Working |
| Product reviews & ratings | ✅ Working |
| Quick Order Lists (save & reorder) | ✅ Working |
| Saved addresses with maps | ✅ Working |
| Wishlist (saved items) | ✅ Working |
| Returns & refunds | ✅ Working |

---

## Database & Schema

- **37 Prisma models** fully defined and migrated
- **16 migrations** applied to production (zero rollbacks)
- **PostgreSQL 16** self-hosted in Docker
- **Multi-tenancy** enforced per-query via context helpers
- **Audit trail** via `AuditLog` append-only table

---

## Code Quality

- **Zero TypeScript errors** (strict mode enforced)
- **0 ESLint errors** (~246 warnings remain, mostly `<img>` in admin/brand portal)
- **Typed API contracts** via `src/types/index.ts`
- **Service layer extraction** — business logic in `src/modules/`
- **Event-driven architecture** — BullMQ + Redis for async workflows

---

## Deployment Status

✅ **Live at:** `http://64.227.187.210/` (DigitalOcean droplet, $29/mo)

- All core marketplace features operational
- Vendor portal, admin dashboard, customer flows all active
- Razorpay payments + webhook verified
- Email + SMS notifications working
- Zero downtime since deployment

---

## Timeline

| Date | Milestone |
|------|-----------|
| 2026-03-20 | Initial schema + auth setup |
| 2026-04-10 | Phase 2 (cart, delivery slots, MOV, pincode gate) |
| 2026-04-15 | Phase 3 (BullMQ notifications, event bus) |
| 2026-04-21 | Refunds, returns, webhook verification, image optimization |
| 2026-04-22 | Rate limiting, audit log, Sentry |
| 2026-04-29 | Full audit + bug fixes (TOCTOU, N+1, timezone, idempotency) |

---

## What's Left Before Launch

See [ROADMAP.md](ROADMAP.md) for remaining work (P0/P1/P2 tasks, blockers, and strategic initiatives).
