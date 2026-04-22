# Horeca1 — Production Roadmap
_Last updated: 2026-04-22. What's left before true v1 launch, grouped by priority._

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
| P0.1 | Razorpay webhook — `POST /api/v1/payments/webhook`, HMAC-verified, handles `payment.captured` / `payment.failed` | `14e7771` |
| P1.6 | Search — `pg_trgm` fuzzy match (typo tolerance) + raw SQL fixed for lowercase table name | `5586a0d` |
| P1.7 | Vendor onboarding documents — `VendorDocument` model, vendor settings upload UI, admin vendor detail verification UI + API | `14e7771` + `d34cb93` |
| P1.8 | Refunds & returns — `ReturnRequest` model, customer "Request Return" UI on order page, admin Returns page with approve/reject/refund flow | `14e7771` + `d34cb93` |
| P1.9 | Invoice PDF — GST-compliant PDF via pdfkit, `GET /api/v1/orders/[id]/invoice`, Download button on order detail | `14e7771` |
| P1.11 | Brand dropdown — vendor product create/edit uses `<datalist>` populated from `/api/v1/brands` | `14e7771` |
| P1.12 | Image optimization — 22 `<img>` → Next.js `<Image>` across Hero, Navbar, TopVendors, RecommendedCategories, checkout, category, vendor portal | `14e7771` + `d34cb93` |

Deployed on DO Droplet `64.227.187.210`. 16 migrations applied. Zero TS errors.

---

## 🔴 P0 — Must ship before public launch

### 2. WhatsApp notification channel (STUBBED)
**What's there:** Email (Resend) + SMS (MSG91) live in `src/workers/notification.worker.ts`. WhatsApp channel routes into the SMS path (no-op effectively).
**What's missing:** Dedicated WhatsApp send via Gupshup or MSG91 WhatsApp. Order confirmations + delivery updates on WhatsApp are table-stakes for Indian B2B.
**Effort:** 1 day (Gupshup is simpler).
**Files to add:** `src/lib/providers/whatsapp.ts`, wire into `notification.worker.ts` switch.

### 3. Database backups (NOT AUTOMATED)
**What's there:** Postgres running in Docker on the droplet.
**What's missing:** No scheduled `pg_dump` to DO Spaces / S3. A droplet failure = total data loss.
**Why critical:** Production data with no backup strategy is a ticking bomb.
**Effort:** 2 hours.
**Fix:** Cron on droplet → `pg_dump | gzip | aws s3 cp s3://horeca1-backups/` daily + weekly retention policy.

### 4. SSL / HTTPS certificate
**What's there:** Nginx on port 80 (HTTP only).
**What's missing:** Let's Encrypt cert + HTTPS redirect + HSTS header.
**Why critical:** Razorpay, cookies with `secure: true`, SEO — all require HTTPS. Needs a real domain pointing at the droplet.
**Effort:** 2 hours (once domain DNS points at droplet).
**Fix:** `certbot --nginx` + redirect in `docker/nginx/nginx.conf`.

### 5. Order confirmation + email receipt end-to-end test
**What exists:** event bus emits `order.created`, worker consumes it, email provider sends.
**What's missing:** Nobody has verified the full chain in prod. Need a smoke test: place an order → customer gets email → vendor gets email → `Notification.status` flips to `sent`.
**Effort:** 30 min of manual testing.

---

## 🟠 P1 — Should ship in next 2 weeks

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
| ~246 remaining lint warnings (`<img>` in admin/brand portal, unused vars) | Low | 1 day |
| No test suite | High | 1 week MVP |
| No CI/CD | Medium | 1 day |
| `ecosystem.config.js` (PM2) present but Docker is the deploy target — one is dead code | Low | 1 hour |
| `_ctx` params littered across API routes | Trivial | — |

---

## 📊 Suggested sequencing

**Immediate (blockers):** P0 items 3–5 → backups + HTTPS + email smoke test.
**Week 1:** P0.2 (WhatsApp) + P1.11 (Sentry).
**Week 2:** P2.13 (CI/CD) + P2.16 (Analytics).
**Month 2+:** Tests, i18n, credit flow, push notifications.

Nothing in P2/P3 blocks launch — P0 items 3–5 are the must-resolve before going public.

---

## 🎯 Launch-readiness checklist

Before flipping DNS to the droplet and announcing publicly:

- [ ] HTTPS + real domain + HSTS
- [x] Razorpay webhook live + tested with a real payment
- [ ] Daily Postgres backups to S3/Spaces, verified restore
- [ ] Sentry receiving errors from prod
- [ ] Email deliverability tested (SPF/DKIM for sending domain)
- [ ] MSG91 SMS DLT templates approved (Indian regulation)
- [ ] Terms of Service + Privacy Policy pages published
- [ ] Legal entity + GST registration referenced in footer/invoice
- [ ] One full order placed end-to-end: signup → cart → slot → pay → confirm → notify → vendor ship → delivered → review
- [ ] At least 10 real vendors onboarded with products, so the site doesn't look empty
- [ ] Admin team trained to handle approvals + support

Everything above is **doable in ~2 weeks of focused work** before a public launch.
