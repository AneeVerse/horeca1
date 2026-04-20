# Horeca1 — Production Roadmap
_Last updated: 2026-04-20. What's left before true v1 launch, grouped by priority._

---

## SHIPPED (for context)

| Phase | Scope | Commit |
|-------|-------|--------|
| 1 | UX wiring — 3 bulk slabs, per-PO checkout, approvals Edit, vendor order-list shortcut, MOV enforcement | `60a1b7f` |
| 2 | Schema + UX — multi-category, delivery-slot picker, MOV, OOS alternates, pincode gate | `35b56cb` |
| 3 | Notifications — BullMQ worker, email + SMS providers, event bus, `/api/v1/health` | `c1d1c92` |
| 4.2 | "Complete your profile" nudge | `3fc88bb` |
| 4.4 | Homepage + search polish, real deals feed, honest vendor cards | `27080f5` |
| 5.1 | Module extraction — services under `src/modules/` already in place | pre-existing |
| 5.2 | Event bus seam — `src/events/emitter.ts` | `c1d1c92` |
| 5.3 | Multi-tenancy enforcement — `resolveVendorContext`/`resolveBrandContext` | pre-existing |
| 5.4 | Redis-backed rate limiter — ZSET sliding window + circuit breaker | `bb64e96` |
| 5.5 | Audit log — `AuditLog` model, fire-and-forget `logAction`, admin routes wired | `bb64e96` |
| — | Lint sweep — 0 errors, typed everything, deferred setState | `39f407c` |

Deployed on DO Droplet `64.227.187.210`. 14 migrations applied. Zero TS errors.

---

## 🔴 P0 — Must ship before public launch

### 1. Razorpay webhook endpoint (MISSING)
**What's there:** `/api/v1/payments/initiate` + `/api/v1/payments/verify` (signature check via HMAC).
**What's missing:** `/api/v1/payments/webhook` to receive Razorpay's server-to-server events (`payment.captured`, `payment.failed`, `refund.processed`). Verify-only flow misses payments where the user closes the tab mid-flow.
**Why critical:** Without webhooks, a paid order can remain stuck in `pending` if the frontend verify call never fires. Lost orders = lost money.
**Effort:** 1 day.
**Files to add:** `src/app/api/v1/payments/webhook/route.ts`, extend `PaymentService.handleWebhook()`.

### 2. WhatsApp notification channel (STUBBED)
**What's there:** Email (Resend) + SMS (MSG91) live in `src/workers/notification.worker.ts`.
**What's missing:** `Notification.channel === 'whatsapp'` currently no-ops. Gupshup or MSG91 WhatsApp integration.
**Why critical:** Order confirmations + delivery updates on WhatsApp are table-stakes for Indian B2B.
**Effort:** 1 day (Gupshup is simpler).
**Files to add:** `src/lib/providers/whatsapp.ts`, wire into `notification.worker.ts` switch.

### 3. Database backups (NOT AUTOMATED)
**What's there:** Postgres running in Docker on the droplet.
**What's missing:** No scheduled `pg_dump` to DO Spaces / S3. A droplet failure = total data loss.
**Why critical:** Production data with no backup strategy is a ticking bomb.
**Effort:** 2 hours.
**Fix:** Cron on droplet → `pg_dump | gzip | aws s3 cp s3://horeca1-backups/` daily + weekly retention policy.

### 4. SSL / HTTPS certificate
**What's there:** Nginx on port 80 (HTTP only — verified via `curl http://64.227.187.210`).
**What's missing:** Let's Encrypt cert + HTTPS redirect + HSTS header.
**Why critical:** Razorpay, cookies with `secure: true`, SEO — all require HTTPS. A real domain (horeca1.com?) + certbot is needed before public launch.
**Effort:** 2 hours (once domain DNS points at droplet).
**Fix:** `certbot --nginx` + redirect in `docker/nginx/nginx.conf`.

### 5. Order confirmation + email receipt end-to-end test
**What exists:** event bus emits `order.created`, worker consumes it, email provider sends.
**What's missing:** Nobody has verified the full chain in prod. Need a smoke test: place an order → customer gets email → vendor gets email → `Notification.status` flips to `sent`.
**Effort:** 30 min of manual testing.

---

## 🟠 P1 — Should ship in next 2 weeks

### 6. Search — full-text / better relevance
**What's there:** ILIKE-based fuzzy match in `src/modules/catalog/search.service.ts`.
**Gap:** No typo tolerance, no synonym handling, no weighted ranking (name > description > category). "panner" won't match "paneer".
**Fix options:** Postgres `pg_trgm` + `to_tsvector` (free, 1 day) OR Meilisearch/Typesense (1 week, better UX).

### 7. Vendor onboarding documents
**What's there:** Basic signup; `vendor.status` flips `pending → approved` via admin.
**Gap:** No document upload (FSSAI license, GST cert, PAN, bank proof). Admin can't verify anything.
**Fix:** Add `VendorDocument` model (+ upload to ImageKit), admin approval page shows documents.
**Effort:** 2 days.

### 8. Refunds & returns
**What's there:** Razorpay has refund APIs; `Payment` model has status.
**Gap:** No customer-facing "request return" button, no admin refund flow, no `Return` / `RefundRequest` model.
**Fix:** Add model + `/api/v1/orders/[id]/return` + admin page.
**Effort:** 3 days.

### 9. Invoice / tax-compliant bill PDF
**What's there:** Order data in DB, GST/HSN fields on Product.
**Gap:** No PDF invoice generation. Indian B2B buyers need tax invoices for input credit.
**Fix options:** `@react-pdf/renderer` server-side, or Puppeteer in a worker.
**Effort:** 2 days.

### 10. Push notifications (in-browser + FCM)
**What's there:** `Notification.channel: 'push'` is stubbed.
**Gap:** No service worker, no subscription flow, no FCM server key.
**Fix:** `next-pwa` service worker + Web Push API + FCM for mobile browsers.
**Effort:** 3 days.

### 11. Sentry — verified wiring
**What's there:** `@sentry/nextjs` installed, config files present, env vars in `.env.example`.
**Gap:** Nobody has confirmed errors actually reach Sentry in prod. `/sentry-example-page` exists for a test.
**Fix:** Set `SENTRY_DSN` on droplet, trigger the test page, verify dashboard receives.
**Effort:** 30 min.

### 12. Image optimization sweep
**What's there:** ImageKit configured + 268 lint warnings for `<img>` usage instead of `<Image>`.
**Gap:** Real LCP hit on homepage + vendor pages from unoptimized `<img>` tags.
**Fix:** Replace `<img src>` with `<Image>` in the top-traffic 10 components.
**Effort:** 1 day.

---

## 🟡 P2 — Nice-to-have / strategic

### 13. CI/CD pipeline
**Missing:** `.github/workflows/` has nothing. Deploy is a manual SSH + bash script.
**Fix:** GitHub Actions — on push to master, run `tsc + lint + build`, then SSH to droplet and run the deploy script. Add a staging environment.
**Effort:** 1 day.

### 14. Test suite
**Missing:** No unit tests, no integration tests, no E2E. CLAUDE.md literally says "No test suite is configured."
**Fix:** Playwright for critical flows (signup, add to cart, checkout, place order), Vitest for services (payment.verify, rateLimit, auditLog).
**Effort:** 1 week for MVP coverage.

### 15. i18n (Phase 4.3 — deliberately skipped)
**Missing:** `next-intl` install + Hindi + Marathi locales.
**Fix:** Mumbai-first — start with `en` + `hi`. Persist `User.locale`.
**Effort:** 3 days.

### 16. Analytics
**Missing:** No event tracking — what do users search, where do they drop off, which products convert?
**Fix options:** PostHog (self-hosted), Umami, or GA4. PostHog is the most versatile for a B2B SaaS.
**Effort:** 1 day.

### 17. Credit onboarding / KYC
**What's there:** `CreditAccount` model, `/api/v1/credit/signup` endpoint.
**Gap:** No UI flow for customer to apply for credit, no underwriting logic, no limit-approval workflow.
**Effort:** 1 week.

### 18. Vendor dashboard — reports
**What's there:** Orders + inventory views.
**Gap:** No "monthly revenue", "top products", "lost sales from OOS" reports.
**Effort:** 3 days.

### 19. Admin — bulk operations
**What's there:** CSV import for products/categories exists.
**Gap:** No bulk vendor approval, no bulk price update, no bulk category reassignment.
**Effort:** 2 days.

### 20. Background image optimization
**Gap:** ImageKit is wired but no automatic resize/format conversion on upload — raw uploads served as-is.
**Fix:** Server-side transform URLs via ImageKit's URL API on `src/lib/providers/imagekit.ts`.
**Effort:** 1 day.

---

## 🔵 P3 — Long-term platform work

- **Mobile apps** (React Native or Capacitor wrapping the web)
- **Vendor self-serve onboarding** (currently admin-approved manually)
- **Inventory sync** with external systems (Tally, Zoho Inventory)
- **Delivery partner integration** (Dunzo, Porter, WeFast)
- **Multi-region** — currently Mumbai-first. Data model supports pincode scoping, but routing/CDN/latency tuning not done.
- **Seller advertising** — promoted placements on homepage/category pages
- **Reviews moderation** workflow for admin
- **Loyalty program** / rewards

---

## 🧹 Technical debt

| Debt | Severity | Fix cost |
|------|----------|----------|
| 268 lint warnings (`<img>`, unused vars) | Low | 1 day |
| No test suite | High | 1 week MVP |
| No CI/CD | Medium | 1 day |
| `ecosystem.config.js` (PM2) present but Docker is the deploy target — one is dead code | Low | 1 hour |
| `mockData.ts` / `vendorData.ts` — CLAUDE.md said "all data is mock" but it's real now; files may still exist unused | Low | 1 hour audit |
| Middleware has `req` unused in some handlers | Trivial | 30 min |
| `_ctx` params littered across API routes | Trivial | — |

---

## 📊 Suggested sequencing

**Week 1 (hard launch blockers):** P0 items 1–5 → safe payments + backups + HTTPS.
**Week 2:** P1 items 6, 7, 11, 12 → search quality, vendor docs, Sentry verify, image sweep.
**Week 3:** P1 items 8, 9 → refunds + invoices (legal/compliance).
**Week 4:** P1 item 10 + P2 item 13 → push notifications + CI/CD.
**Month 2+:** Tests, i18n, analytics, credit flow.

---

## 🎯 Launch-readiness checklist

Before flipping DNS to the droplet and announcing publicly:

- [ ] HTTPS + real domain + HSTS
- [ ] Razorpay webhook live + tested with a real payment
- [ ] Daily Postgres backups to S3/Spaces, verified restore
- [ ] Sentry receiving errors from prod
- [ ] Email deliverability tested (SPF/DKIM for sending domain)
- [ ] MSG91 SMS DLT templates approved (Indian regulation)
- [ ] Terms of Service + Privacy Policy pages published
- [ ] Legal entity + GST registration referenced in footer/invoice
- [ ] One full order placed end-to-end: signup → cart → slot → pay → confirm → notify → vendor ship → delivered → review
- [ ] At least 10 real vendors onboarded with products, so the site doesn't look empty
- [ ] Admin team trained to handle approvals + support

Everything above is **doable in ~4 weeks of focused work** before a public launch.
