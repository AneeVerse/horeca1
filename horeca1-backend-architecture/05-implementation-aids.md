# Horeca1 — Part 5: Implementation Aids (Deliverable C)

## C.1 — Sample Controller → Service Pseudocode Flows

### Flow 1: Login

```typescript
// src/app/api/v1/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validators/auth';
import { AuthService } from '@/services/auth.service';
import { errorResponse } from '@/middleware/errorHandler';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validate
    const body = await req.json();
    const validated = loginSchema.parse(body); // Zod validation

    // 2. Call service
    const authService = new AuthService();
    const result = await authService.login(validated.email, validated.password);

    // 3. Return response
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

// src/services/auth.service.ts
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/events/emitter';

export class AuthService {
  async login(email: string, password: string) {
    // 1. Authenticate via Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email, password,
    });
    if (error) throw new AuthError('Invalid credentials', 401);

    // 2. Fetch user profile from app DB
    const user = await prisma.user.findUnique({
      where: { supabaseAuthId: data.user.id },
      select: { id: true, email: true, role: true, fullName: true },
    });
    if (!user || !user.isActive) throw new AuthError('Account not found', 404);

    // 3. Emit event
    eventEmitter.emit('UserLoggedIn', { userId: user.id });

    // 4. Return session + user
    return {
      user,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    };
  }
}
```

### Flow 2: Vendor Catalog Listing with Search + pgvector

```typescript
// src/app/api/v1/products/search/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const pincode = searchParams.get('pincode') || '';
  const cursor = searchParams.get('cursor');
  const limit = parseInt(searchParams.get('limit') || '20');

  const searchService = new SearchService();
  const results = await searchService.search(q, pincode, cursor, limit);

  return NextResponse.json({ success: true, data: results });
}

// src/services/search.service.ts
import { prisma } from '@/lib/prisma';

export class SearchService {
  async search(query: string, pincode: string, cursor?: string, limit = 20) {
    // 1. Full-Text Search (FTS) — exact/fuzzy keyword match
    const ftsResults = await prisma.$queryRaw`
      SELECT p.id, p.name, p.slug, p.base_price, p.image_url,
             v.id as vendor_id, v.business_name, v.rating,
             ts_rank(p.search_vector, plainto_tsquery('english', ${query})) as rank
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      JOIN service_areas sa ON sa.vendor_id = v.id
      WHERE p.is_active = true
        AND v.is_active = true
        AND sa.pincode = ${pincode}
        AND p.search_vector @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    // 2. Semantic Search (pgvector) — if FTS yields < 5 results
    let semanticResults = [];
    if (ftsResults.length < 5) {
      const embedding = await this.getEmbedding(query); // Call embedding API
      semanticResults = await prisma.$queryRaw`
        SELECT p.id, p.name, p.slug, p.base_price, p.image_url,
               v.id as vendor_id, v.business_name,
               1 - (p.embedding <=> ${embedding}::vector) as similarity
        FROM products p
        JOIN vendors v ON p.vendor_id = v.id
        JOIN service_areas sa ON sa.vendor_id = v.id
        WHERE p.is_active = true AND sa.pincode = ${pincode}
        ORDER BY p.embedding <=> ${embedding}::vector
        LIMIT ${limit}
      `;
    }

    // 3. Merge & deduplicate
    const products = this.mergeResults(ftsResults, semanticResults);

    // 4. Extract unique vendors & categories for the 3-block response
    const vendors = this.extractUniqueVendors(products);
    const categories = await this.getMatchingCategories(query);

    return { products, vendors, categories };
  }

  private async getEmbedding(text: string): Promise<number[]> {
    // Call OpenAI or a local model to get 384-dim embedding
    // Return float array
  }
}
```

### Flow 3: Create PO + Event Emits

```typescript
// src/app/api/v1/orders/route.ts
export async function POST(req: NextRequest) {
  const user = await authenticate(req); // middleware
  const body = await req.json();
  const validated = createOrderSchema.parse(body);

  const orderService = new OrderService();
  const result = await orderService.createFromCart(user.id, validated);

  return NextResponse.json({ success: true, data: result }, { status: 201 });
}

// src/services/order.service.ts
import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/events/emitter';
import { InventoryService } from './inventory.service';
import { PaymentService } from './payment.service';

export class OrderService {
  private inventoryService = new InventoryService();
  private paymentService = new PaymentService();

  async createFromCart(userId: string, input: CreateOrderInput) {
    // Use Prisma transaction for atomicity
    return await prisma.$transaction(async (tx) => {
      const orders = [];

      for (const vendorOrder of input.vendor_orders) {
        // 1. Validate stock
        const stockCheck = await this.inventoryService.bulkCheck(
          vendorOrder.items, tx
        );
        if (stockCheck.some(s => !s.available)) {
          throw new OrderError('Some items are out of stock', 400);
        }

        // 2. Validate MOV
        const vendor = await tx.vendor.findUnique({
          where: { id: vendorOrder.vendor_id },
        });
        const subtotal = await this.calculateSubtotal(vendorOrder.items, tx);
        if (subtotal < vendor.minOrderValue) {
          throw new OrderError(
            `Minimum order ₹${vendor.minOrderValue} for ${vendor.businessName}`, 400
          );
        }

        // 3. Create order
        const orderNumber = await this.generateOrderNumber(); // PO-2026-XXXX
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            vendorId: vendorOrder.vendor_id,
            status: 'pending',
            subtotal,
            totalAmount: subtotal, // + tax if applicable
            paymentMethod: input.payment_method,
            deliverySlotId: vendorOrder.delivery_slot_id,
            notes: vendorOrder.notes,
            items: {
              create: vendorOrder.items.map(item => ({
                productId: item.product_id,
                productName: item.name,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                totalPrice: item.quantity * item.unit_price,
              })),
            },
          },
          include: { items: true },
        });

        // 4. Reserve inventory
        await this.inventoryService.reserveStock(vendorOrder.items, tx);

        orders.push(order);
      }

      // 5. Clear cart
      await tx.cartItem.deleteMany({ where: { cart: { userId } } });

      // 6. Emit events (after transaction commits)
      setImmediate(() => {
        for (const order of orders) {
          eventEmitter.emit('OrderCreated', {
            orderId: order.id,
            userId,
            vendorId: order.vendorId,
            totalAmount: order.totalAmount,
            items: order.items,
          });
        }
      });

      // 7. Create Razorpay orders if payment method is razorpay
      let paymentDetails = [];
      if (input.payment_method === 'razorpay') {
        paymentDetails = await Promise.all(
          orders.map(o => this.paymentService.createRazorpayOrder(o))
        );
      }

      return { orders, payment_details: paymentDetails };
    });
  }
}
```

---

## C.2 — Background Job Spec: Invoice Generation

```typescript
// src/queues/invoice.queue.ts
import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';

export const invoiceQueue = new Queue('invoice-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

// src/workers/invoice.worker.ts
import { Worker, Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

const invoiceWorker = new Worker(
  'invoice-generation',
  async (job: Job) => {
    const { orderId } = job.data;

    // Idempotency check — skip if invoice already exists
    const existingInvoice = await prisma.notification.findFirst({
      where: { referenceId: orderId, referenceType: 'invoice', status: 'sent' },
    });
    if (existingInvoice) {
      console.log(`Invoice already generated for order ${orderId}, skipping.`);
      return { skipped: true };
    }

    // 1. Fetch order with items, vendor, customer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, vendor: true, user: true },
    });
    if (!order) throw new Error(`Order ${orderId} not found`);

    // 2. Generate PDF (using @react-pdf/renderer or puppeteer)
    const pdfBuffer = await generateInvoicePDF(order);

    // 3. Upload to ImageKit or Supabase Storage
    const invoiceUrl = await uploadInvoice(pdfBuffer, order.orderNumber);

    // 4. Store reference
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: 'invoice',
        channel: 'email',
        title: `Invoice for ${order.orderNumber}`,
        body: `Your invoice is ready: ${invoiceUrl}`,
        referenceId: orderId,
        referenceType: 'invoice',
        status: 'sent',
      },
    });

    return { invoiceUrl, orderNumber: order.orderNumber };
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: { max: 10, duration: 60000 }, // 10 invoices/min
  }
);

// Triggered by PaymentReceived event listener:
// src/events/listeners/payment.listener.ts
eventEmitter.on('PaymentReceived', async ({ orderId }) => {
  await invoiceQueue.add('generate', { orderId }, {
    jobId: `invoice-${orderId}`, // Idempotency key
    delay: 2000, // Wait 2s for DB to settle
  });
});
```

**Scheduling:** Not periodic — triggered per order on `PaymentReceived` event.
**Retry:** 2 attempts, 5s fixed backoff.
**Idempotency:** `jobId: invoice-${orderId}` prevents duplicate jobs; DB check inside worker prevents duplicate processing.

---

## C.3 — Pagination / Filtering / Sorting Spec

| List Endpoint | Pagination | Default Limit | Max Limit | Sorting | Filtering |
|---|---|---|---|---|---|
| `GET /vendors` | Cursor | 20 | 50 | `rating`, `name`, `min_order_value` | `pincode`, `category_id`, `credit_enabled` |
| `GET /vendors/:id/products` | Cursor | 20 | 50 | `price`, `name`, `created_at` | `category_id`, `in_stock`, `min_price`, `max_price` |
| `GET /products/search` | Cursor | 20 | 50 | `relevance` (default), `price` | `pincode`, `category_id`, `vendor_id` |
| `GET /categories` | Offset | 50 | 100 | `sort_order`, `name` | `parent_id`, `is_active` |
| `GET /orders` | Cursor | 20 | 50 | `created_at` (default desc) | `status`, `vendor_id`, `payment_status` |
| `GET /lists` | Offset | 20 | 50 | `updated_at` desc | `vendor_id` |
| `GET /notifications` | Cursor | 20 | 50 | `created_at` desc | `type`, `read` (boolean) |
| `GET /credit/transactions` | Cursor | 20 | 50 | `created_at` desc | `vendor_id`, `type` |

**Cursor format:** `?cursor=<last_item_uuid>&limit=20`
**Response shape:**
```json
{
  "data": [...],
  "pagination": { "next_cursor": "uuid_or_null", "has_more": true }
}
```
For offset: `?page=1&limit=20` → `{ "pagination": { "page": 1, "total_pages": 5, "total_count": 95 } }`

---

## C.4 — Error Code Mapping

| HTTP Status | Error Code | Message Template | Used By |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Field-level errors from Zod | All endpoints |
| 400 | `BELOW_MOV` | "Minimum order value is ₹{mov} for {vendor}" | Orders, Cart checkout |
| 400 | `OUT_OF_STOCK` | "{product} has only {available} units available" | Cart, Orders |
| 400 | `INSUFFICIENT_CREDIT` | "Available credit ₹{available}, required ₹{amount}" | Credit apply |
| 401 | `UNAUTHORIZED` | "Authentication required" | All protected |
| 401 | `INVALID_CREDENTIALS` | "Invalid email or password" | Auth login |
| 401 | `TOKEN_EXPIRED` | "Session expired, please login again" | All protected |
| 403 | `FORBIDDEN` | "You don't have permission for this action" | RBAC violations |
| 403 | `ACCOUNT_DEACTIVATED` | "Your account has been deactivated" | Auth |
| 404 | `NOT_FOUND` | "{resource} not found" | All GET by ID |
| 409 | `DUPLICATE` | "{field} already exists" | Signup, Create |
| 429 | `RATE_LIMITED` | "Too many requests. Try again in {seconds}s" | All |
| 500 | `INTERNAL_ERROR` | "Something went wrong" | Catch-all |
| 502 | `PAYMENT_GATEWAY_ERROR` | "Payment service unavailable" | Payments |

**Standard error response body:**
```json
{
  "success": false,
  "error": {
    "code": "BELOW_MOV",
    "message": "Minimum order value is ₹500 for Dairy Direct",
    "details": { "vendor_id": "uuid", "current_total": 350, "min_order_value": 500 }
  }
}
```

---

## C.5 — RBAC Table

| Endpoint | customer | vendor | admin |
|---|---|---|---|
| `POST /auth/signup` | ✅ Public | ✅ Public | ✅ Public |
| `POST /auth/login` | ✅ Public | ✅ Public | ✅ Public |
| `GET /auth/me` | ✅ | ✅ | ✅ |
| `GET /vendors` | ✅ | ✅ | ✅ |
| `GET /vendors/:id` | ✅ | ✅ | ✅ |
| `POST /vendors` | ❌ | ❌ | ✅ |
| `PUT /vendors/:id` | ❌ | ✅ own | ✅ |
| `GET /vendors/:id/products` | ✅ | ✅ | ✅ |
| `POST /products` | ❌ | ✅ own | ✅ |
| `PUT /products/:id` | ❌ | ✅ own | ✅ |
| `GET /products/search` | ✅ Public | ✅ Public | ✅ |
| `GET /cart` | ✅ | ❌ | ❌ |
| `POST /cart/items` | ✅ | ❌ | ❌ |
| `POST /cart/checkout` | ✅ | ❌ | ❌ |
| `POST /orders` | ✅ | ❌ | ❌ |
| `GET /orders` | ✅ own | ✅ own | ✅ all |
| `PUT /orders/:id/status` | ❌ | ✅ own | ✅ |
| `POST /orders/reorder/:id` | ✅ own | ❌ | ❌ |
| `GET /lists` | ✅ | ❌ | ❌ |
| `POST /lists/:id/order` | ✅ | ❌ | ❌ |
| `POST /payments/initiate` | ✅ | ❌ | ❌ |
| `POST /payments/verify` | ✅ webhook | ✅ webhook | ✅ |
| `GET /credit/check` | ✅ | ❌ | ✅ |
| `POST /credit/apply` | ✅ | ❌ | ❌ |
| `PUT /credit/:id/approve` | ❌ | ✅ own | ✅ |
| `PUT /inventory/:id` | ❌ | ✅ own | ✅ |
| `GET /admin/*` | ❌ | ❌ | ✅ |

---

## C.6 — Suggested Rate Limits

| Endpoint Category | Rate Limit | Window | Key |
|---|---|---|---|
| Auth (login, signup, OTP) | 5 requests | 1 min | IP |
| Auth (password reset) | 3 requests | 15 min | IP + email |
| Search | 60 requests | 1 min | IP |
| Vendor listing/detail | 100 requests | 1 min | IP |
| Cart operations | 30 requests | 1 min | User ID |
| Order creation | 10 requests | 1 min | User ID |
| Checkout / Payment | 5 requests | 1 min | User ID |
| Credit operations | 10 requests | 1 min | User ID |
| Quick Order Lists | 30 requests | 1 min | User ID |
| Admin endpoints | 100 requests | 1 min | User ID |
| Webhook (payments/verify) | 50 requests | 1 min | IP (Razorpay IPs whitelisted) |
| Global fallback | 200 requests | 1 min | IP |

Implementation: `@upstash/ratelimit` with sliding window via Upstash Redis.

---

## C.7 — Migration Plan Example

```bash
# Step 1: Initialize Prisma
npx prisma init --datasource-provider postgresql

# Step 2: Add schema.prisma (from Deliverable B.3)
# Copy the Prisma schema into prisma/schema.prisma

# Step 3: Create initial migration
npx prisma migrate dev --name init_schema
# Creates: prisma/migrations/20260316_init_schema/migration.sql

# Step 4: Enable pgvector & FTS extensions (manual SQL in migration)
# Add to migration.sql:
#   CREATE EXTENSION IF NOT EXISTS vector;
#   CREATE EXTENSION IF NOT EXISTS pg_trgm;

# Step 5: Apply RLS policies (manual SQL after Prisma migration)
npx prisma db execute --file prisma/rls_policies.sql

# Step 6: Seed the database
npx prisma db seed
# Runs prisma/seed.ts — creates admin, sample vendors, products, etc.

# Step 7: Deploy to production
npx prisma migrate deploy

# Step 8: Verify
npx prisma studio  # Visual DB browser
```

**Sample seed excerpt (prisma/seed.ts):**
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Admin user
  const admin = await prisma.user.create({
    data: {
      supabaseAuthId: '00000000-0000-0000-0000-000000000001',
      email: 'admin@horeca1.com', fullName: 'Admin', role: 'admin',
    },
  });

  // Sample vendor
  const vendorUser = await prisma.user.create({
    data: {
      supabaseAuthId: '00000000-0000-0000-0000-000000000002',
      email: 'vendor@dairydirect.com', fullName: 'Ramesh Dairy', role: 'vendor',
      pincode: '400001', businessName: 'Dairy Direct',
    },
  });

  const vendor = await prisma.vendor.create({
    data: {
      userId: vendorUser.id, businessName: 'Dairy Direct',
      slug: 'dairy-direct', minOrderValue: 500, creditEnabled: true,
      isVerified: true, isActive: true,
      serviceAreas: { create: [{ pincode: '400001' }, { pincode: '400002' }] },
      deliverySlots: {
        create: [
          { dayOfWeek: 1, slotStart: '06:00', slotEnd: '08:00', cutoffTime: '20:00' },
        ],
      },
    },
  });

  // Categories
  const dairy = await prisma.category.create({
    data: { name: 'Dairy', slug: 'dairy', imageUrl: 'https://ik.imagekit.io/horeca1/dairy.jpg' },
  });

  // Products with price slabs
  await prisma.product.create({
    data: {
      vendorId: vendor.id, categoryId: dairy.id,
      name: 'Amul Paneer 1kg', slug: 'amul-paneer-1kg',
      basePrice: 320, packSize: '1 kg', unit: 'kg', creditEligible: true,
      priceSlabs: {
        create: [
          { vendorId: vendor.id, minQty: 1, maxQty: 4, price: 320, sortOrder: 0 },
          { vendorId: vendor.id, minQty: 5, maxQty: 9, price: 310, sortOrder: 1 },
          { vendorId: vendor.id, minQty: 10, price: 295, sortOrder: 2 },
        ],
      },
      inventory: {
        create: { vendorId: vendor.id, qtyAvailable: 150, lowStockThreshold: 10 },
      },
    },
  });

  // Sample customer with Quick Order List
  const customer = await prisma.user.create({
    data: {
      supabaseAuthId: '00000000-0000-0000-0000-000000000003',
      email: 'chef@hoteltaj.com', fullName: 'Rajesh Kumar', role: 'customer',
      pincode: '400001', businessName: 'Hotel Taj',
    },
  });

  console.log('Seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```
