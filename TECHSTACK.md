# HoReCa1 — Tech Stack & Deployment

## Tech Stack

| Layer | Technology | Price |
|-------|-----------|-------|
| Framework + Frontend | Next.js (App Router, React 19, TypeScript) | NA |
| Styling | Tailwind CSS 4 | NA |
| Animations | Framer Motion | NA |
| Auth | Auth.js v5 (NextAuth) | NA |
| Database | PostgreSQL (Docker) | NA |
| ORM | Prisma | NA |
| Queue / Jobs | BullMQ + Redis | NA |
| Events | Custom EventEmitter | NA |
| Payments | Razorpay | Pay-per-txn (2%) |
| CDN / Images | ImageKit | NA |
| Maps | Google Maps API | Pay-per-use |

## Deployment (DigitalOcean Droplet)

| Resource | Spec | Price/mo |
|----------|------|----------|
| Droplet | 2 vCPU, 4GB RAM | $24 |
| Backups (Spaces) | Daily pg_dump | $5 |
| **Total** | | **$29/mo (~₹2,465)** |

> Variable costs: Razorpay (2% per txn), Google Maps (after $200 free credit/mo), ImageKit (after 20GB bandwidth/mo). Early stage = $29/mo flat.

## Database Approach

| What | Detail |
|------|--------|
| Database | PostgreSQL in Docker on same Droplet |
| ORM | Prisma |
| Multi-tenancy | Application-level (Prisma query filters with `vendorId`) |
| Modules | Auth, Vendor, Catalog, Search, Inventory, Order, Cart, Payment, Credit (DiSCCO), Notification, Quick Order Lists |
| Backups | Automated daily pg_dump to DigitalOcean Spaces |
