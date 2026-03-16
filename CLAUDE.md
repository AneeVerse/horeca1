# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test suite is configured. Verify changes visually at `localhost:3000`.

## What This App Is

**HoReCa Hub** — a B2B e-commerce marketplace for restaurant, hotel, and catering businesses to buy food and supplies from vendors. Think Swiggy-style vendor marketplace but for bulk B2B procurement.

Key domain concepts:
- Cart is **vendor-grouped** — items from different vendors create separate order groups
- Products can have **bulk price tiers** (`bulkPrices: BulkPriceTier[]`) for quantity discounts
- Orders go through a status lifecycle: `draft → pending → confirmed → processing → out_for_delivery → delivered`
- Users have saved **order lists** (reusable procurement templates, not the same as cart)

## Architecture

**Stack:** Next.js (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Framer Motion

### Routing
```
src/app/
├── page.tsx                    # Homepage
├── admin/                      # Admin dashboard (approvals, customers, vendors, orders, finance)
├── vendor/[id]/                # Vendor storefront with product catalog
├── category/[slug]/[categoryId]/ # Browse by category
├── product/[id]/               # Product detail
├── search/                     # Search results
├── cart/                       # Cart
├── checkout/                   # Checkout
├── orders/                     # Order history
├── order-lists/                # Saved order templates
└── wishlist/ | profile/
```

### State Management
React Context only — no Redux/Zustand. Three contexts:
- `CartContext` (`src/context/CartContext.tsx`) — cart state, vendor grouping, persisted to `localStorage`
- `WishlistContext` (`src/context/WishlistContext.tsx`) — wishlist, persisted to `localStorage`
- `AddressContext` (`src/context/AddressContext.tsx`) — addresses + Google Geolocation/Reverse Geocoding

### Data
All data is currently mock/static from `src/lib/mockData.ts` and `src/data/vendorData.ts`. No backend API exists yet. The type contracts are fully defined in `src/types/index.ts`.

### Components
```
src/components/
├── layout/        # Navbar, Footer, MobileBottomNav, overlays (search, location, pincode)
├── features/      # Feature-grouped: homepage sections, vendor/, order-lists/, auth/
└── providers/     # GoogleMapsProvider
```

`VendorProductCard` (`src/components/features/vendor/VendorProductCard.tsx`) is the primary product card used across vendor pages and search — it handles bulk tier pricing display, cart integration, and wishlist.

### Environment
Requires `.env.local`:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```
Needs Maps JavaScript API, Places API (New), and Geocoding API enabled.

## Critical Patterns

### Fluid Responsive Design (enforced)
Prefer `clamp()` over breakpoint-only responsive classes. CSS variables are defined in `globals.css`:
```tsx
// Preferred
<h1 className="text-[clamp(2rem,5vw+1rem,4rem)]">
<div className="p-[clamp(1rem,3vw,3rem)]">

// Avoid
<h1 className="text-4xl md:text-5xl lg:text-6xl">
```

### Server vs Client Components
- Default to Server Components for pages and static content
- Add `'use client'` only for interactivity, context consumers, or animations
- Layout components (`Navbar`, `MobileBottomNav`) are client components due to overlays and cart state

### Lazy-load heavy components
```tsx
const HeavyComponent = dynamic(() => import('./HeavyComponent'), { ssr: false });
```

### Path alias
`@/*` maps to `src/*` — use it for all imports.

## Performance Targets
LCP < 2.5s · FID < 100ms · CLS < 0.1 · TTI < 3.5s
