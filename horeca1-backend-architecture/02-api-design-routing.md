# Horeca1 — Part 2: API Design & Routing Table

## 5. API Design (REST, /api/v1/)

> All endpoints require `Authorization: Bearer <jwt>` unless marked **Public**.
> Pagination: cursor-based for large lists (`?cursor=<id>&limit=20`); offset for small static lists.
> Filtering: query params (`?category_id=...&min_price=...`). Sorting: `?sort=price&order=asc`.

---

### 5.1 Auth Module

#### POST `/api/v1/auth/signup`
- **Description:** Register new customer/vendor (Tech Stack p11; UI-UX p2 flows 1–3)
- **Auth:** Public
- **Request:**
```json
{
  "email": "chef@hotel.com",
  "phone": "+919876543210",
  "password": "SecureP@ss1",
  "full_name": "Rajesh Kumar",
  "role": "customer",
  "pincode": "400001",
  "business_name": "Hotel Taj"
}
```
- **Response (201):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "chef@hotel.com", "role": "customer" },
    "session": { "access_token": "jwt...", "refresh_token": "rt...", "expires_at": 1710600000 }
  }
}
```
- **Errors:** `400` Invalid input, `409` Email/phone already exists

#### POST `/api/v1/auth/login`
- **Description:** Login with email+password or OTP (Tech Stack p11)
- **Auth:** Public
- **Request:**
```json
{ "email": "chef@hotel.com", "password": "SecureP@ss1" }
```
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "chef@hotel.com", "role": "customer", "full_name": "Rajesh Kumar" },
    "session": { "access_token": "jwt...", "refresh_token": "rt...", "expires_at": 1710600000 }
  }
}
```
- **Errors:** `401` Invalid credentials, `403` Account deactivated

#### POST `/api/v1/auth/otp/request`
- **Description:** Request OTP for phone login (UI-UX p2 mentions OTP)
- **Auth:** Public
- **Request:** `{ "phone": "+919876543210" }`
- **Response (200):** `{ "success": true, "message": "OTP sent" }`

#### POST `/api/v1/auth/otp/verify`
- **Auth:** Public
- **Request:** `{ "phone": "+919876543210", "otp": "123456" }`
- **Response (200):** Same as login response

#### POST `/api/v1/auth/refresh`
- **Auth:** Public (requires valid refresh token)
- **Request:** `{ "refresh_token": "rt..." }`
- **Response (200):** New access_token + refresh_token

#### POST `/api/v1/auth/logout`
- **Auth:** Customer, Vendor, Admin
- **Response (200):** `{ "success": true }`

#### POST `/api/v1/auth/password/reset`
- **Auth:** Public
- **Request:** `{ "email": "chef@hotel.com" }`
- **Response (200):** `{ "success": true, "message": "Reset link sent" }`

#### PUT `/api/v1/auth/password/update`
- **Auth:** Customer, Vendor, Admin
- **Request:** `{ "token": "reset-token", "new_password": "NewP@ss1" }`

#### GET `/api/v1/auth/me`
- **Auth:** Customer, Vendor, Admin
- **Response (200):** Current user profile

---

### 5.2 Vendor Module

#### GET `/api/v1/vendors`
- **Description:** List vendors by pincode/serviceability (Tech Stack p11; UI-UX p6 flows 7, 23)
- **Auth:** Public
- **Query:** `?pincode=400001&category_id=uuid&sort=rating&order=desc&cursor=uuid&limit=20`
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "uuid", "business_name": "Dairy Direct", "slug": "dairy-direct",
        "logo_url": "https://ik.imagekit.io/...", "rating": 4.5,
        "min_order_value": 500, "credit_enabled": true,
        "delivery_info": "Next day by 7 AM",
        "categories": ["Dairy", "Beverages"]
      }
    ],
    "pagination": { "next_cursor": "uuid", "has_more": true }
  }
}
```

#### GET `/api/v1/vendors/:id`
- **Description:** Vendor store details (Tech Stack p11; UI-UX p7 Vendor Store Layout)
- **Auth:** Public
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid", "business_name": "Dairy Direct", "slug": "dairy-direct",
    "description": "Premium dairy wholesaler", "logo_url": "...", "banner_url": "...",
    "rating": 4.5, "min_order_value": 500, "credit_enabled": true,
    "delivery_slots": [{ "day": "Monday", "slot": "6AM-8AM", "cutoff": "8PM previous day" }],
    "categories": [{ "id": "uuid", "name": "Cheese", "product_count": 12 }],
    "service_pincodes": ["400001", "400002"]
  }
}
```

#### GET `/api/v1/vendors/:id/products`
- **Description:** Vendor catalog with category filter (Tech Stack p11; UI-UX p7)
- **Auth:** Public
- **Query:** `?category_id=uuid&search=paneer&sort=price&order=asc&cursor=uuid&limit=20`
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid", "name": "Amul Paneer 1kg", "slug": "amul-paneer-1kg",
        "image_url": "...", "pack_size": "1 kg", "base_price": 320.00,
        "price_slabs": [
          { "min_qty": 1, "max_qty": 4, "price": 320.00 },
          { "min_qty": 5, "max_qty": 9, "price": 310.00 },
          { "min_qty": 10, "max_qty": null, "price": 295.00 }
        ],
        "credit_eligible": true, "in_stock": true, "qty_available": 150
      }
    ],
    "pagination": { "next_cursor": "uuid", "has_more": true }
  }
}
```

#### POST `/api/v1/vendors` **(ASSUMPTION A10 — vendor onboarding)**
- **Auth:** Admin
- **Request:** `{ "user_id": "uuid", "business_name": "...", "slug": "...", "min_order_value": 500 }`

#### PUT `/api/v1/vendors/:id`
- **Auth:** Vendor (own), Admin
- **Request:** Partial update fields

#### GET `/api/v1/vendors/my-vendors`
- **Description:** Customer's saved/frequented vendors (UI-UX p5 flow 23)
- **Auth:** Customer
- **Response:** Array of vendor summaries with `last_ordered_at`

#### POST `/api/v1/vendors/:id/follow`
- **Description:** Add vendor to "My Vendors" (UI-UX p5)
- **Auth:** Customer

#### DELETE `/api/v1/vendors/:id/follow`
- **Auth:** Customer

---

### 5.3 Catalog Module

#### GET `/api/v1/products/search`
- **Description:** Cross-vendor product search with FTS + pgvector (Tech Stack p11; UI-UX p3 flow 5)
- **Auth:** Public
- **Query:** `?q=tomato+ketchup&pincode=400001&cursor=uuid&limit=20`
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid", "name": "Kissan Tomato Ketchup 1L",
        "vendor": { "id": "uuid", "business_name": "Grocery Hub", "rating": 4.2 },
        "base_price": 185.00, "image_url": "..."
      }
    ],
    "vendors": [
      { "id": "uuid", "business_name": "Grocery Hub", "rating": 4.2, "min_order_value": 300, "credit_enabled": false }
    ],
    "categories": [
      { "id": "uuid", "name": "Sauces & Condiments", "slug": "sauces-condiments" }
    ],
    "pagination": { "next_cursor": "uuid", "has_more": true }
  }
}
```
> **Note:** Search results return 3 blocks per UI-UX p3, p5: Products (quick access), Top Vendors, Categories.

#### GET `/api/v1/categories`
- **Description:** Category listing (Tech Stack p11; UI-UX p3 flow 6)
- **Auth:** Public
- **Query:** `?parent_id=uuid` (for subcategories)
- **Response:** `{ "categories": [{ "id": "uuid", "name": "Dairy", "slug": "dairy", "image_url": "...", "children": [...] }] }`

#### GET `/api/v1/categories/:id/vendors`
- **Description:** Vendors selling products in a category, filtered by pincode (UI-UX p6 Category→Vendors flow)
- **Auth:** Public
- **Query:** `?pincode=400001&sort=rating&cursor=uuid&limit=20`

#### GET `/api/v1/collections`
- **Description:** Curated collections (UI-UX p10 — Oriental Kitchen, Italian Essentials, etc.) **(ASSUMPTION A3)**
- **Auth:** Public

#### GET `/api/v1/collections/:id`
- **Description:** Collection detail with products
- **Auth:** Public

#### POST `/api/v1/products` — Add product
- **Auth:** Vendor (own store)
- **Request:** `{ "name": "...", "category_id": "uuid", "base_price": 320, "pack_size": "1kg", "price_slabs": [...] }`

#### PUT `/api/v1/products/:id` — Update product
- **Auth:** Vendor (own), Admin

#### DELETE `/api/v1/products/:id` — Soft delete
- **Auth:** Vendor (own), Admin

---

### 5.4 Inventory Module

#### GET `/api/v1/inventory/:productId`
- **Auth:** Vendor (own), Admin
- **Response:** `{ "qty_available": 150, "qty_reserved": 20, "low_stock_threshold": 10 }`

#### PUT `/api/v1/inventory/:productId`
- **Description:** Update stock levels
- **Auth:** Vendor (own), Admin
- **Request:** `{ "qty_available": 200, "low_stock_threshold": 15 }`

#### POST `/api/v1/inventory/check`
- **Description:** Bulk stock check for multiple products (used by Cart validate — UI-UX p8 step 2)
- **Auth:** Customer, Vendor
- **Request:** `{ "items": [{ "product_id": "uuid", "quantity": 5 }] }`
- **Response:** `{ "results": [{ "product_id": "uuid", "available": true, "qty_available": 150 }] }`

---

### 5.5 Order Module

#### POST `/api/v1/orders`
- **Description:** Create Purchase Order(s) from cart (Tech Stack p11; UI-UX p8–p9 PO creation)
- **Auth:** Customer
- **Request:**
```json
{
  "vendor_orders": [
    {
      "vendor_id": "uuid",
      "items": [{ "product_id": "uuid", "quantity": 5 }],
      "delivery_slot_id": "uuid",
      "notes": "Deliver to back gate"
    }
  ],
  "payment_method": "razorpay"
}
```
- **Response (201):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid", "order_number": "PO-2026-0001", "vendor_id": "uuid",
        "status": "pending", "total_amount": 1600.00,
        "payment": { "razorpay_order_id": "order_xxx", "amount": 160000, "currency": "INR" }
      }
    ]
  }
}
```
- **Events emitted:** `OrderCreated`

#### GET `/api/v1/orders`
- **Description:** Customer order history (UI-UX p3 flow 10)
- **Auth:** Customer, Vendor (own orders)
- **Query:** `?status=delivered&vendor_id=uuid&cursor=uuid&limit=20`

#### GET `/api/v1/orders/:id`
- **Auth:** Customer (own), Vendor (own orders), Admin

#### POST `/api/v1/orders/reorder/:id`
- **Description:** Reorder a past order (Tech Stack p11; UI-UX p3 flow 10, p9 reorder)
- **Auth:** Customer
- **Request:** `{ "adjustments": [{ "product_id": "uuid", "quantity": 3 }] }`
- **Response:** Same as `POST /orders` — creates new PO(s) with items from previous order
- **Events emitted:** `OrderCreated`

#### PUT `/api/v1/orders/:id/status`
- **Description:** Update order status (vendor confirms/ships)
- **Auth:** Vendor (own orders), Admin
- **Request:** `{ "status": "confirmed" }`
- **Events emitted:** `OrderConfirmed`, `OrderShipped`, etc.

#### POST `/api/v1/orders/:id/save-as-list`
- **Description:** Save a past order as Quick Order List (UI-UX p4 flow 16)
- **Auth:** Customer
- **Request:** `{ "list_name": "Weekly Dairy Order" }`

---

### 5.6 Cart Module

#### GET `/api/v1/cart`
- **Description:** View cart grouped by vendor (Tech Stack p11; UI-UX p8 step 1)
- **Auth:** Customer
- **Response:**
```json
{
  "success": true,
  "data": {
    "vendor_groups": [
      {
        "vendor": { "id": "uuid", "business_name": "Dairy Direct", "min_order_value": 500 },
        "items": [
          { "product_id": "uuid", "name": "Amul Paneer 1kg", "quantity": 5, "unit_price": 310.00, "total": 1550.00 }
        ],
        "subtotal": 1550.00,
        "meets_mov": true
      }
    ],
    "total": 1550.00
  }
}
```

#### POST `/api/v1/cart/items`
- **Description:** Add item to cart (UI-UX p8 Add to Cart flow)
- **Auth:** Customer
- **Request:** `{ "product_id": "uuid", "vendor_id": "uuid", "quantity": 3 }`

#### PUT `/api/v1/cart/items/:itemId`
- **Description:** Update cart item quantity (UI-UX p8 step 2)
- **Auth:** Customer
- **Request:** `{ "quantity": 5 }`

#### DELETE `/api/v1/cart/items/:itemId`
- **Auth:** Customer

#### POST `/api/v1/cart/checkout`
- **Description:** Validate cart & initiate checkout (Tech Stack p11; UI-UX p8 step 3)
- **Auth:** Customer
- **Request:** `{ "payment_method": "razorpay" }`
- **Response:** Stock validation results + Razorpay order IDs per vendor

#### DELETE `/api/v1/cart`
- **Description:** Clear entire cart
- **Auth:** Customer

---

### 5.7 Quick Order Lists Module

#### GET `/api/v1/lists`
- **Description:** Get all user's Quick Order Lists (Tech Stack p11; UI-UX p4 flows 12–16)
- **Auth:** Customer
- **Response:**
```json
{
  "success": true,
  "data": {
    "lists": [
      {
        "id": "uuid", "name": "Cheese-Butter [Dairy Direct]",
        "vendor": { "id": "uuid", "business_name": "Dairy Direct" },
        "item_count": 8, "updated_at": "2026-03-15T10:00:00Z"
      }
    ]
  }
}
```

#### GET `/api/v1/lists/:id`
- **Description:** Get list items with current prices & stock (UI-UX p4 flow 14)
- **Auth:** Customer
- **Response:** List items with `default_qty`, `last_ordered_qty`, current prices

#### POST `/api/v1/lists`
- **Description:** Create new Quick Order List (UI-UX p4 flow 13)
- **Auth:** Customer
- **Request:** `{ "name": "Weekly Dairy", "vendor_id": "uuid", "items": [{ "product_id": "uuid", "default_qty": 5 }] }`

#### PUT `/api/v1/lists/:id`
- **Auth:** Customer
- **Request:** `{ "name": "Updated Name" }`

#### POST `/api/v1/lists/:id/items`
- **Description:** Add item to list (UI-UX p4 flow 12)
- **Auth:** Customer

#### DELETE `/api/v1/lists/:id/items/:itemId`
- **Auth:** Customer

#### POST `/api/v1/lists/:id/order`
- **Description:** Order from a Quick Order List (Tech Stack p11; UI-UX p4 flow 14)
- **Auth:** Customer
- **Request:** `{ "items": [{ "product_id": "uuid", "quantity": 5 }, ...] }`
- **Response:** Creates cart items → redirects to checkout
- **Events emitted:** `ListOrdered`

#### DELETE `/api/v1/lists/:id`
- **Auth:** Customer

---

### 5.8 Payment Module

#### POST `/api/v1/payments/initiate`
- **Description:** Create Razorpay order (Tech Stack p11; UI-UX p9)
- **Auth:** Customer
- **Request:** `{ "order_id": "uuid", "method": "razorpay" }`
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "razorpay_order_id": "order_xxx",
    "amount": 160000,
    "currency": "INR",
    "key_id": "rzp_live_xxx"
  }
}
```

#### POST `/api/v1/payments/verify`
- **Description:** Razorpay webhook / client-side verification (Tech Stack p11)
- **Auth:** Public (webhook signature verified)
- **Request:** `{ "razorpay_order_id": "order_xxx", "razorpay_payment_id": "pay_xxx", "razorpay_signature": "sig..." }`
- **Response (200):** `{ "success": true, "payment_status": "captured" }`
- **Events emitted:** `PaymentReceived` or `PaymentFailed`

#### GET `/api/v1/payments/:orderId`
- **Auth:** Customer (own), Vendor (own orders), Admin

---

### 5.9 Credit (DiSCCO) Module

#### GET `/api/v1/credit/check`
- **Description:** Check customer credit with a vendor (Tech Stack p11; UI-UX p9)
- **Auth:** Customer
- **Query:** `?vendor_id=uuid`
- **Response:**
```json
{
  "success": true,
  "data": {
    "credit_limit": 50000.00, "credit_used": 12000.00, "available": 38000.00,
    "status": "active",
    "upcoming_dues": [{ "amount": 5000, "due_date": "2026-03-25" }]
  }
}
```

#### POST `/api/v1/credit/apply`
- **Description:** Apply credit to an order (Tech Stack p11; UI-UX p9)
- **Auth:** Customer
- **Request:** `{ "order_id": "uuid", "amount": 1600.00 }`
- **Events emitted:** `CreditApplied`

#### POST `/api/v1/credit/signup`
- **Description:** Request credit line from vendor (UI-UX p2 flow 4)
- **Auth:** Customer
- **Request:** `{ "vendor_id": "uuid", "requested_limit": 50000, "documents": ["url1"] }`

#### PUT `/api/v1/credit/:accountId/approve`
- **Auth:** Vendor (own customers), Admin
- **Request:** `{ "credit_limit": 50000 }`

#### GET `/api/v1/credit/transactions`
- **Auth:** Customer, Vendor (own)
- **Query:** `?vendor_id=uuid&cursor=uuid&limit=20`

---

### 5.10 Notification Module

#### GET `/api/v1/notifications`
- **Auth:** Customer, Vendor
- **Query:** `?type=order&read=false&cursor=uuid&limit=20`

#### PUT `/api/v1/notifications/:id/read`
- **Auth:** Customer, Vendor

#### PUT `/api/v1/notifications/read-all`
- **Auth:** Customer, Vendor

---

### 5.11 Admin Module **(ASSUMPTION A7)**

#### GET `/api/v1/admin/users`
- **Auth:** Admin — List/search all users

#### PUT `/api/v1/admin/users/:id`
- **Auth:** Admin — Update/deactivate users

#### GET `/api/v1/admin/vendors`
- **Auth:** Admin — List all vendors with approval status

#### PUT `/api/v1/admin/vendors/:id/verify`
- **Auth:** Admin — Approve/reject vendor

#### GET `/api/v1/admin/orders`
- **Auth:** Admin — All orders with filters

#### GET `/api/v1/admin/dashboard`
- **Auth:** Admin — Aggregate stats (GMV, orders, users, vendors)

#### POST `/api/v1/admin/collections`
- **Auth:** Admin — CRUD collections

#### POST `/api/v1/admin/categories`
- **Auth:** Admin — CRUD categories

---

### 5.12 Serviceability Module

#### GET `/api/v1/serviceability/check`
- **Description:** Check if pincode is serviceable (UI-UX p2 flow 1)
- **Auth:** Public
- **Query:** `?pincode=400001`
- **Response:** `{ "serviceable": true, "vendor_count": 12 }`

---

## 6. Routing Table

| Frontend Page/Flow | UI-UX Ref | Backend Endpoint(s) | DB Table(s) | Response Shape |
|---|---|---|---|---|
| Pincode check (entry) | p2 flow 1 | `GET /serviceability/check` | service_areas | `{ serviceable, vendor_count }` |
| Homepage | p10 | `GET /vendors?pincode=`, `GET /categories`, `GET /collections`, `GET /orders?limit=3` | vendors, categories, collections, orders, customer_vendors | Vendor cards, category grid, collections, recent orders |
| Search results | p3 flow 5, p5–6 | `GET /products/search?q=&pincode=` | products (FTS/pgvector), vendors, categories | 3 blocks: products, vendors, categories |
| Category → Vendors | p3 flow 6, p6 | `GET /categories/:id/vendors?pincode=` | categories, vendors, service_areas, products | Vendor list + top products |
| Vendor Store | p7 | `GET /vendors/:id`, `GET /vendors/:id/products` | vendors, products, price_slabs, inventory, delivery_slots | Full store: header, categories, product grid |
| Product detail | p7 | `GET /vendors/:vendorId/products` (single) | products, price_slabs, inventory | Product card with slabs, stock |
| Cart (multi-vendor) | p8 | `GET /cart` | carts, cart_items, products, vendors | Vendor-grouped items, subtotals, MOV check |
| PO creation | p8–9 | `POST /orders`, `POST /cart/checkout` | orders, order_items, cart_items, inventory | PO summary per vendor |
| Quick Order Lists | p4 flows 12–16 | `GET /lists`, `GET /lists/:id`, `POST /lists/:id/order` | quick_order_lists, quick_order_list_items, products | List of lists; list items with prices |
| My Vendors | p5 flow 23 | `GET /vendors/my-vendors` | customer_vendors, vendors | Vendor cards with last order date |
| Reorder | p3 flow 10, p9 | `POST /orders/reorder/:id` | orders, order_items, products, inventory | New PO from past order |
| Credit signup | p2 flow 4 | `POST /credit/signup` | credit_accounts | Application status |
| Credit at checkout | p9 | `GET /credit/check`, `POST /credit/apply` | credit_accounts, credit_transactions | Available credit, apply result |
| Payment | p9 | `POST /payments/initiate`, `POST /payments/verify` | payments, orders | Razorpay order ID / verification |
| Order confirmation | p9 | `GET /orders/:id` | orders, order_items | Order summary, delivery schedule |
| Order history | p3 flow 10 | `GET /orders` | orders, order_items | Paginated order list |
| Save order as list | p4 flow 16 | `POST /orders/:id/save-as-list` | quick_order_lists, quick_order_list_items | New list created |
| Notifications | - | `GET /notifications` | notifications | Paginated notifications |
| Admin dashboard | Tech p8 | `GET /admin/dashboard` | orders, users, vendors, payments | Aggregate stats |
