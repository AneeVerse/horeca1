# Horeca1 — Complete Backend Architecture Package

> **Prepared:** March 16, 2026 | **Version:** 1.0
> **Sources:** Horeca1 V2.2 UI-UX Notes; Horeca1 Tech Stack Architecture Report

---

## STEP 0 — Verification

### Documents Accessed
| Document | Pages | Status |
|---|---|---|
| Horeca1_Tech_Stack_Architecture_Report.pdf | 14 pages (Sections 1–8) | ✅ Fully read |
| Horeca1 V2.2 - UI-UX Notes.pdf | 12 pages (24 flows, homepage structure, vendor store layout) | ✅ Fully read |

### Key Findings (8 bullets)

1. **Vendor-centric marketplace** (Swiggy model): customers buy from vendors, not a universal product pool. Flow: Search → Vendor → Catalog → Order (UI-UX p2).
2. **24 user flows** defined: Guest onboarding, search/category/vendor discovery, cart/PO/payment, Quick Order Lists (persistent smart purchase lists), reorder, credit (DiSCCO) (UI-UX p2–p10).
3. **5-layer architecture**: Frontend (Next.js App Router) → Backend API (Next.js API Routes, 9 modules) → Infrastructure (Event Bus + BullMQ/Redis) → Data (PostgreSQL/Supabase + Prisma + RLS) → External (Razorpay, ImageKit, Sentry, Supabase Auth) (Tech Stack p8).
4. **9 independent backend modules**: Auth, Vendor, Catalog, Inventory, Order, Payment, Credit, Notification, Quick Order — each owns its data and APIs; modules communicate via Event Bus (Tech Stack p9).
5. **Multi-tenancy via RLS**: Single PostgreSQL DB with `vendor_id` columns; Row-Level Security policies per vendor (Tech Stack p9–p10).
6. **Event-driven order flow**: OrderCreated → Inventory reserve, Notification queue, Payment initiation, Credit deduction → PaymentReceived → Confirmation + Invoice PDF generation via background queue (Tech Stack p11–p12).
7. **3 cost phases**: Phase 1 (Dev, ₹0/mo), Phase 2 (Launch 500–5K users, ~₹4,675–₹6,885/mo), Phase 3 (Growth 5K–50K, ~₹25,075/mo) (Tech Stack p7).
8. **Quick Order Lists = "super power feature"**: persistent smart purchase lists enabling 10–30 second repeat ordering; critical for B2B retention and AOV (UI-UX p4, p12).

---

## ASSUMPTIONS

> Items not explicitly stated in either PDF but required for a production system.

| # | Assumption | Affects |
|---|---|---|
| A1 | **Pincode/serviceability** stored in a `service_areas` table linking vendors to pincodes they serve. UI-UX mentions "Verify Pincode Serviceability" but schema not specified. | Schema, API |
| A2 | **Delivery slots** modeled as a `delivery_slots` table per vendor. UI-UX p5 mentions "Sees next delivery" but no schema given. | Schema, API |
| A3 | **Collections** (Oriental Kitchen, Italian Essentials, etc.) modeled as curated `collections` table with M:N product links. UI-UX p10 lists them under homepage sections. | Schema, API |
| A4 | **Wallet** payments mentioned (UI-UX p9) but no details — assumed as a simple balance ledger per customer. | Schema, Payment API |
| A5 | **Minimum Order Value (MOV)** stored per vendor in `vendors` table. UI-UX p5 references MOV flow. | Schema |
| A6 | **Bulk/slab pricing** stored as JSON array or separate `price_slabs` table. UI-UX p7 shows "up to 3 slabs." | Schema |
| A7 | **Admin panel** implied (Tech Stack p8 mentions "Admin Panel") but no detailed flows — basic CRUD on all entities assumed. | API, RBAC |
| A8 | **SMS/WhatsApp notifications** via third-party provider (e.g., MSG91 or Twilio) — not specified in docs. | Notification module |
| A9 | **Invoice PDF generation** handled by background job (Tech Stack p12 implies it) using a library like `@react-pdf/renderer` or `puppeteer`. | Background Jobs |
| A10 | **Vendor onboarding** flow not detailed in UI-UX — assumed basic registration + admin approval. | API, Schema |
| A11 | **Product images** stored as ImageKit URLs in `products` table. | Schema |
| A12 | **Cursor-based pagination** used for large lists (products, orders) for performance. Offset-based for small static lists (categories). | API Design |

---

## 1. Project Overview

**Horeca1** is a B2B multi-vendor wholesale marketplace designed for the HORECA (Hotels, Restaurants, Cafés) industry in India. It serves two user personas: **HORECA customers** (procurement software — discover vendors, place purchase orders, manage repeat orders, access credit) and **vendors/wholesalers** (cloud-PoS — manage catalog, process orders, track inventory, acquire new customers, manage receivables).

The platform follows a **vendor-centric marketplace model** (analogous to Swiggy's restaurant model): customers discover and buy from specific vendors rather than a universal product pool. Key differentiators include **Quick Order Lists** (persistent smart purchase lists for 10-second repeat ordering), **DiSCCO credit lines** (vendor-funded credit for customers), **multi-vendor cart with vendor-grouped POs**, and **event-driven order processing** with real-time notifications. The backend is built on Next.js API Routes with PostgreSQL (Supabase), Prisma ORM, and enforces multi-tenancy via Row-Level Security.

---

## 2. System Architecture Overview

### 5-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — FRONTEND (Next.js App Router)                        │
│  Customer App │ Vendor Portal │ Admin Panel │ Public Pages       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2 — BACKEND API (Next.js API Routes /api/v1/*)           │
│  Auth│Vendor│Catalog│Inventory│Order│Payment│Credit│Notif│Lists │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3 — INFRASTRUCTURE                                       │
│  Event Bus (In-App EventEmitter) │ Queue (BullMQ + Upstash Redis)│
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4 — DATA                                                  │
│  PostgreSQL (Supabase) + Prisma │ RLS │ FTS + pgvector │ Redis   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5 — EXTERNAL SERVICES                                    │
│  Razorpay │ ImageKit │ Sentry │ Supabase Auth │ SMS/WA Provider  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow (Typical Order Placement)

1. **Customer** → Next.js frontend page sends `POST /api/v1/orders` with cart items.
2. **API Route** → Controller validates JWT (Supabase Auth), extracts `user_id`, calls Order Service.
3. **Order Service** → Validates cart, checks stock (Inventory Service), checks MOV, creates PO records in PostgreSQL via Prisma.
4. **Event Bus** → `OrderCreated` event emitted. Listeners: Inventory (reserve stock), Notification (queue SMS/email), Payment (initiate Razorpay), Credit (deduct if applicable).
5. **Background Queue** → BullMQ workers process notification sends, invoice PDF generation.
6. **Payment webhook** → Razorpay calls `POST /api/v1/payments/verify`. Payment Service verifies signature, emits `PaymentReceived`.
7. **Response** flows back through service → controller → JSON response to frontend.

---

## 3. Technology Stack

| # | Component | Technology | Justification | Source |
|---|---|---|---|---|
| 1 | Frontend Framework | Next.js (App Router) | Single codebase, SSR for SEO, industry standard | Tech Stack §3.1 |
| 2 | Backend API | Next.js API Routes | Co-located with frontend, serverless-ready on Vercel | Tech Stack §3.1 |
| 3 | Database | PostgreSQL (Supabase managed) | Advanced relational DB, RLS for multi-tenancy, FTS built-in | Tech Stack §3.2 |
| 4 | ORM | Prisma | Type-safe queries, auto-migrations, TypeScript integration | Tech Stack §3.4 |
| 5 | Authentication | Supabase Auth | Email/password, OTP, social login, session management, included free | Tech Stack §3.3 |
| 6 | Payments | Razorpay | India-native, UPI/cards/netbanking, 2% + GST per txn, no monthly fee | Tech Stack §3.5 |
| 7 | Search | PostgreSQL FTS + pgvector | Free, built-in; pgvector for semantic/AI search | Tech Stack §3.6 |
| 8 | Image Management | ImageKit | CDN, optimization, 20GB free bandwidth | Tech Stack §3.7 |
| 9 | Hosting / CI | Vercel | Optimized for Next.js, global CDN, serverless functions | Tech Stack §3.8 |
| 10 | Queue / Jobs | Upstash Redis + BullMQ | Serverless Redis, background job processing | Tech Stack §3.9 |
| 11 | Event Bus | Custom in-app EventEmitter | Free, decoupled module communication; scale to Redis Pub/Sub at 10K+ | Tech Stack §3.10 |
| 12 | Monitoring | Sentry | Error tracking, performance monitoring, free tier for dev | Tech Stack §3.11 |
| 13 | SMS/WhatsApp | MSG91 or Twilio **(ASSUMPTION A8)** | Required for OTP and order notifications | - |

---

## 4. Database Schema Design

### 4.1 Entity Relationship Summary

| Table | Owner Module | Multi-tenant (vendor_id)? | RLS? |
|---|---|---|---|
| users | Auth | No | Yes (user sees own) |
| vendors | Vendor | No (is the tenant) | Yes |
| vendor_stores | Vendor | Yes | Yes |
| service_areas | Vendor | Yes | Yes |
| categories | Catalog | No (global) | No |
| products | Catalog | Yes | Yes |
| price_slabs | Catalog | Yes | Yes |
| inventory | Inventory | Yes | Yes |
| carts | Order | No | Yes (user) |
| cart_items | Order | Yes | Yes |
| orders | Order | Yes | Yes |
| order_items | Order | Yes | Yes |
| quick_order_lists | Quick Order | Yes | Yes (user+vendor) |
| quick_order_list_items | Quick Order | Yes | Yes |
| payments | Payment | Yes | Yes |
| credit_accounts | Credit | Yes | Yes |
| credit_transactions | Credit | Yes | Yes |
| notifications | Notification | No | Yes (user) |
| collections | Catalog | No (admin) | No |
| collection_products | Catalog | Yes | No |
| delivery_slots | Vendor | Yes | Yes |
| wallets | Payment | No | Yes (user) |
| wallet_transactions | Payment | No | Yes (user) |
| customer_vendors | Vendor | Yes | Yes (user) |

### 4.2 Table Definitions with DDL

#### `users`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Maps to Supabase Auth user |
| supabase_auth_id | UUID | UNIQUE, NOT NULL | FK to Supabase auth.users |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| phone | VARCHAR(20) | UNIQUE | |
| full_name | VARCHAR(255) | NOT NULL | |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'customer' | 'customer', 'vendor', 'admin' |
| pincode | VARCHAR(10) | | For serviceability |
| business_name | VARCHAR(255) | | HORECA business name |
| gst_number | VARCHAR(20) | | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `idx_users_email`, `idx_users_phone`, `idx_users_pincode`, `idx_users_role`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id UUID UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','vendor','admin')),
  pincode VARCHAR(10),
  business_name VARCHAR(255),
  gst_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_pincode ON users(pincode);
CREATE INDEX idx_users_role ON users(role);

-- RLS: user sees own row; admin sees all
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self ON users FOR ALL USING (id = current_setting('app.current_user_id')::UUID);
CREATE POLICY users_admin ON users FOR ALL USING (current_setting('app.current_user_role') = 'admin');
```

#### `vendors`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users(id), UNIQUE | Owner user |
| business_name | VARCHAR(255) | NOT NULL | |
| slug | VARCHAR(255) | UNIQUE, NOT NULL | URL-friendly name |
| description | TEXT | | |
| logo_url | VARCHAR(512) | | ImageKit URL |
| banner_url | VARCHAR(512) | | |
| rating | DECIMAL(2,1) | DEFAULT 0 | |
| min_order_value | DECIMAL(10,2) | DEFAULT 0 | MOV (A5) |
| credit_enabled | BOOLEAN | DEFAULT false | DiSCCO |
| is_active | BOOLEAN | DEFAULT true | |
| is_verified | BOOLEAN | DEFAULT false | Admin approval (A10) |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  business_name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url VARCHAR(512),
  banner_url VARCHAR(512),
  rating DECIMAL(2,1) DEFAULT 0,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  credit_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_vendors_slug ON vendors(slug);
CREATE INDEX idx_vendors_active ON vendors(is_active) WHERE is_active = true;

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendors_read_all ON vendors FOR SELECT USING (true);
CREATE POLICY vendors_write_own ON vendors FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY vendors_admin ON vendors FOR ALL USING (current_setting('app.current_user_role') = 'admin');
```

#### `service_areas` (A1)
```sql
CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  pincode VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendor_id, pincode)
);
CREATE INDEX idx_service_areas_pincode ON service_areas(pincode);
CREATE INDEX idx_service_areas_vendor ON service_areas(vendor_id);

ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY sa_read_all ON service_areas FOR SELECT USING (true);
CREATE POLICY sa_write_vendor ON service_areas FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = current_setting('app.current_user_id')::UUID));
```

#### `categories`
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id),
  image_url VARCHAR(512),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
-- No RLS — global read. Admin-only write enforced at API level.
```

#### `products`
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(512),
  pack_size VARCHAR(100),
  unit VARCHAR(50),
  base_price DECIMAL(10,2) NOT NULL,
  credit_eligible BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  search_vector TSVECTOR,
  embedding VECTOR(384),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendor_id, slug)
);
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_embedding ON products USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_read_all ON products FOR SELECT USING (true);
CREATE POLICY products_write_vendor ON products FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = current_setting('app.current_user_id')::UUID));
```

#### `price_slabs` (A6 — up to 3 bulk price tiers per product, UI-UX p7)
```sql
CREATE TABLE price_slabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  min_qty INT NOT NULL,
  max_qty INT,
  price DECIMAL(10,2) NOT NULL,
  sort_order INT DEFAULT 0,
  UNIQUE(product_id, min_qty)
);
CREATE INDEX idx_price_slabs_product ON price_slabs(product_id);

ALTER TABLE price_slabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_read_all ON price_slabs FOR SELECT USING (true);
CREATE POLICY ps_write_vendor ON price_slabs FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = current_setting('app.current_user_id')::UUID));
```

#### `inventory`
```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  qty_available INT NOT NULL DEFAULT 0,
  qty_reserved INT NOT NULL DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_inventory_vendor ON inventory(vendor_id);
CREATE INDEX idx_inventory_product ON inventory(product_id);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_read_all ON inventory FOR SELECT USING (true);
CREATE POLICY inv_write_vendor ON inventory FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = current_setting('app.current_user_id')::UUID));
```

#### `delivery_slots` (A2)
```sql
CREATE TABLE delivery_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  cutoff_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(vendor_id, day_of_week, slot_start)
);
CREATE INDEX idx_delivery_slots_vendor ON delivery_slots(vendor_id);
```

#### `customer_vendors` (My Vendors — UI-UX p5 flow 23)
```sql
CREATE TABLE customer_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  last_ordered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, vendor_id)
);
CREATE INDEX idx_cv_user ON customer_vendors(user_id);
CREATE INDEX idx_cv_vendor ON customer_vendors(vendor_id);
```

#### `carts` & `cart_items`
```sql
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cart_id, product_id)
);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_vendor ON cart_items(vendor_id);
```

#### `orders` & `order_items`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
  subtotal DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(30),
  payment_status VARCHAR(20) DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','partial','refunded')),
  delivery_slot_id UUID REFERENCES delivery_slots(id),
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_vendor ON orders(vendor_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_customer ON orders FOR SELECT USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY orders_vendor ON orders FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = current_setting('app.current_user_id')::UUID));
CREATE POLICY orders_admin ON orders FOR ALL USING (current_setting('app.current_user_role') = 'admin');
```

#### `quick_order_lists` & `quick_order_list_items` (UI-UX p4, flows 12–16)
```sql
CREATE TABLE quick_order_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_qol_user ON quick_order_lists(user_id);
CREATE INDEX idx_qol_vendor ON quick_order_lists(vendor_id);

CREATE TABLE quick_order_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES quick_order_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  default_qty INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  UNIQUE(list_id, product_id)
);
CREATE INDEX idx_qoli_list ON quick_order_list_items(list_id);
```

#### `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  user_id UUID NOT NULL REFERENCES users(id),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature VARCHAR(255),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','authorized','captured','failed','refunded')),
  method VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_razorpay ON payments(razorpay_order_id);
```

#### `credit_accounts` & `credit_transactions` (DiSCCO — UI-UX p2 flow 4, p9)
```sql
CREATE TABLE credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_used DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, vendor_id)
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id UUID NOT NULL REFERENCES credit_accounts(id),
  order_id UUID REFERENCES orders(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('debit','credit','adjustment')),
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ct_account ON credit_transactions(credit_account_id);
```

#### `wallets` & `wallet_transactions` (A4 — UI-UX p9)
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit','debit')),
  amount DECIMAL(12,2) NOT NULL,
  reference_id UUID,
  reference_type VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `collections` & `collection_products` (A3 — UI-UX p10)
```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url VARCHAR(512),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE collection_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  sort_order INT DEFAULT 0,
  UNIQUE(collection_id, product_id)
);
```

#### `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(30) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms','email','whatsapp','push','in_app')),
  title VARCHAR(255),
  body TEXT,
  reference_id UUID,
  reference_type VARCHAR(30),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
```
