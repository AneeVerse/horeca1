# HORECA1 — Complete Business Logic Documentation

> **Platform:** Horeca1 — B2B HORECA (Hotel-Restaurant-Cafe) E-commerce Supply Platform
> **Generated:** 2026-03-23

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Product Management](#3-product-management)
4. [Cart Logic](#4-cart-logic)
5. [Checkout Flow](#5-checkout-flow)
6. [Payment Flows](#6-payment-flows)
7. [Order Management](#7-order-management)
8. [Post-Order Processing](#8-post-order-processing)
9. [Categories](#9-categories)
10. [Coupons](#10-coupons)
11. [Reviews & Ratings](#11-reviews--ratings)
12. [Settings System](#12-settings-system)
13. [Additional Entities](#13-additional-entities)
14. [Customer Management](#14-customer-management)
15. [Infrastructure](#15-infrastructure)
16. [Flaws & Improvements](#16-flaws--improvements)

---

## 1. Architecture Overview

### Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 15.4 + React 19.1 (TypeScript) |
| Backend     | Express.js (Node.js)                |
| Database    | MongoDB (Mongoose ODM)              |
| Payments    | Razorpay, Stripe, PayPal            |
| SMS/OTP     | MSG91, Twilio (fallback)            |
| Email       | Nodemailer (Gmail SMTP)             |
| Images      | Cloudinary                          |
| Auth        | JWT + NextAuth (frontend)           |
| Deployment  | Vercel (both frontend and backend)  |

### Directory Structure

```
kachabazar/
├── backend/
│   ├── api/index.js              ← Express entry point
│   ├── config/
│   │   ├── auth.js               ← JWT, encryption, middleware
│   │   └── db.js                 ← MongoDB connection
│   ├── controller/               ← Business logic (14 controllers)
│   ├── lib/
│   │   ├── email-sender/         ← Nodemailer + PDF invoice
│   │   ├── msg91/                ← OTP service
│   │   ├── phone-verification/   ← Twilio fallback
│   │   ├── stock-controller/     ← Stock reduction logic
│   │   ├── stripe/               ← Stripe helpers
│   │   └── paypal/               ← PayPal helpers
│   ├── middleware/                ← DB connection middleware
│   ├── models/                   ← Mongoose schemas (14 models)
│   ├── routes/                   ← API endpoint definitions
│   └── vercel.json
│
├── store/                        ← Next.js frontend
│   └── src/
│       ├── app/                  ← App Router pages
│       │   ├── (store)/          ← Customer-facing pages
│       │   ├── admin/            ← Admin dashboard pages
│       │   └── api/auth/         ← NextAuth route
│       ├── components/           ← Reusable UI components
│       ├── context/              ← React Context providers
│       ├── hooks/                ← Custom hooks (business logic)
│       ├── lib/                  ← Auth helpers, analytics
│       ├── services/             ← API service layers
│       └── utils/                ← Pricing, dates, formatting
│
└── WEBSITE_LOGIC.md              ← This file
```

### Database

- **Cluster:** MongoDB Atlas (`horeca1` database)
- **Connection:** `backend/config/db.js` — pooling: 1–10 sockets, 30s idle timeout
- **Serverless-aware:** Buffering disabled, auto-reconnect, `ensureDBConnection` middleware
- **Health check:** `GET /health` returns DB connection status

### API Versioning

All routes prefixed with `/v1/`:

```
/v1/products/      /v1/category/      /v1/coupon/
/v1/customer/      /v1/order/         /v1/orders/
/v1/admin/         /v1/attribute/     /v1/setting/
/v1/currency/      /v1/language/      /v1/notification/
/v1/banner/        /v1/reviews/
```

### Frontend Provider Stack

```
SessionProvider (NextAuth)
└── LanguageProvider
    └── SidebarProvider
        └── UserProvider
            └── Elements (Stripe)
                └── CartProvider (react-use-cart)
```

Source: `store/src/app/provider.js`

---

## 2. Authentication & Authorization

### 2.1 Phone OTP Login (Primary Method)

**Source:** `backend/controller/customerController.js`, `backend/lib/msg91/otp-service.js`, `store/src/services/OTPServices.js`

**Flow:**
1. User enters 10-digit phone number
2. Frontend formats: strips country code, validates 10 digits
3. `POST /v1/customer/otp/send` — sends 4-digit OTP via MSG91
4. OTP stored in-memory `Map` with 5-minute expiry
5. User enters OTP (4-digit input with auto-advance between fields)
6. `POST /v1/customer/otp/verify` — verifies OTP, returns JWT tokens
7. If phone not found → auto-creates Customer record (passwordless signup)
8. Returns `isNewUser: true` flag when name/email missing
9. `POST /v1/customer/otp/resend` — 30-second cooldown timer

**Frontend page:** `store/src/app/(store)/auth/otp-login/page.jsx`

**Dev mode fallback:** When MSG91 is not configured, OTP stored in-memory and logged to console.

**WebOTP:** Supports Chrome mobile auto-read of SMS OTP via WebOTP API.

### 2.2 Email Registration (Secondary)

**Source:** `backend/controller/customerController.js`

**Flow:**
1. `POST /v1/customer/verify-email` — sends confirmation email with JWT link (15m expiry)
2. User clicks link → `POST /v1/customer/register/:token`
3. Token decoded, customer created with bcrypt-hashed password
4. Rate limited: 3 requests per 30 minutes (`emailVerificationLimit`)

### 2.3 OAuth Social Login

**Source:** `backend/controller/customerController.js`

- `POST /v1/customer/signup/oauth` — Google/Facebook
- Creates or finds customer by email, no password required
- Toggled via store settings (`google_login_status`, `facebook_login_status`)

### 2.4 Admin Authentication

**Source:** `backend/controller/adminController.js`

**Flow:**
1. `POST /v1/admin/login` — email + password (bcrypt comparison)
2. Checks admin `status` is `active`
3. Returns JWT + AES-256-CBC encrypted `access_list` + random IV
4. Frontend decrypts access_list to show/hide admin features

**Default password:** bcrypt hash of `"12345678"` (hardcoded in `backend/models/Admin.js` schema default)

### 2.5 JWT Token Configuration

**Source:** `backend/config/auth.js`

| Token Type        | Expiry     | Secret Env Var         |
|-------------------|------------|------------------------|
| Access Token      | 365 days   | `JWT_SECRET`           |
| Refresh Token     | 365 days   | `JWT_REFRESH_SECRET`   |
| Verification      | 15 minutes | `JWT_SECRET_FOR_VERIFY`|

**Middleware:**
- `isAuth` — extracts `Bearer` token from `Authorization` header, verifies with `JWT_SECRET`
- `isAdmin` — checks if ANY admin exists with role `"Admin"` in the database

### 2.6 Admin Roles

**Source:** `backend/models/Admin.js`

Enum values: `admin`, `super admin`, `cashier`, `manager`, `ceo`, `driver`, `security guard`, `accountant`

- `access_list`: Array of permission strings, encrypted with AES-256-CBC on login response
- Encryption key: `ENCRYPT_PASSWORD` env var (32-digit hex)

### 2.7 Password Management

- `PUT /v1/customer/forget-password` — email with JWT token link (15m expiry)
- `PUT /v1/customer/reset-password` — decode token, find by email, hash new password
- `POST /v1/customer/change-password` — requires current password verification
- Rate limited: 3 per 30 minutes (`passwordVerificationLimit`)

### 2.8 Frontend Session Management

**Source:** `store/src/context/UserContext.js`, `store/src/lib/auth-client.js`

- `userInfo` stored in cookie (30-day expiry via `js-cookie`)
- Actions: `USER_LOGIN`, `USER_LOGOUT`, `SAVE_SHIPPING_ADDRESS`, `SAVE_COUPON`
- `getUserSession()` — non-hook getter, checks cookie
- `useUserSession()` — hook, checks NextAuth session first then cookie
- HTTP interceptor: 401/403 → auto-logout, redirect to `/auth/otp-login`

---

## 3. Product Management

### 3.1 Product Schema

**Source:** `backend/models/Product.js`

| Field              | Type               | Notes                                  |
|--------------------|--------------------|----------------------------------------|
| `productId`        | String             | Generated or custom                    |
| `sku`              | String             | Stock keeping unit                     |
| `hsn`              | String             | Harmonized System Number (India tax)   |
| `unit`             | String             | e.g., "kg", "piece", "litre"           |
| `brand`            | String             | Product brand                          |
| `barcode`          | String             | Barcode value                          |
| `title`            | Object             | Multi-language: `{ en: "...", bn: "..." }` |
| `description`      | Object             | Multi-language                         |
| `slug`             | String (unique)    | URL-friendly name                      |
| `categories`       | [ObjectId]         | Array of category refs                 |
| `category`         | ObjectId           | Primary category ref                   |
| `image`            | [String]           | Array of image URLs                    |
| `stock`            | Number             | Quantity available                     |
| `minOrderQuantity` | Number (default: 1)| Minimum per order                      |
| `sales`            | Number             | Units sold (auto-incremented)          |
| `tag`              | [String]           | Search tags                            |
| `status`           | String             | `"show"` or `"hide"`                   |
| `order`            | Number             | Drag-drop sort position                |
| `isCombination`    | Boolean            | Has variants                           |
| `variants`         | [Mixed]            | Variant options                        |
| `taxPercent`       | Number (default: 0)| GST percentage                         |
| `taxableRate`      | Number             | Price excluding GST                    |
| `average_rating`   | Number             | Auto-calculated from reviews           |
| `total_reviews`    | Number             | Auto-calculated from reviews           |

### 3.2 Pricing Structure

```
prices: {
  originalPrice    ← MRP / list price
  price            ← Current selling price
  discount         ← Discount amount (originalPrice - price)
}
```

### 3.3 Bulk Pricing

```
bulkPricing: {
  bulkRate1: { quantity: 10, pricePerUnit: 150, taxableRate: 127.12 }
  bulkRate2: { quantity: 20, pricePerUnit: 140, taxableRate: 118.64 }
}
```

**Tier selection:** Highest tier where `orderQuantity >= tier.quantity`
- Example: Ordering 25 units → `bulkRate2` applies (25 >= 20)
- Example: Ordering 15 units → `bulkRate1` applies (15 >= 10)
- Example: Ordering 5 units → base price applies

### 3.4 Promo Pricing (Happy Hour: 6PM–9AM IST)

**Source:** `store/src/utils/date.js`

```
promoPricing: {
  singleUnit: 170               ← Promo single unit price
  singleUnitTaxable: 144.07     ← Promo taxable rate
  bulkRate1: { quantity: 10, pricePerUnit: 155, taxableRate: 131.36 }
  bulkRate2: { quantity: 20, pricePerUnit: 145, taxableRate: 122.88 }
}
```

**Time check:**
```javascript
// store/src/utils/date.js
getCurrentISTHour()  → Gets IST hour (0-23) via "Asia/Kolkata" timezone
checkIsPromoTime()   → Returns true when hours >= 18 || hours < 9
```

**Test override:** `NEXT_PUBLIC_TEST_HOUR` env var forces a specific hour for testing.

### 3.5 Tax Calculation

```
taxableRate = price / (1 + taxPercent / 100)
GST amount  = price - taxableRate
```

Example: Product at ₹118, taxPercent = 18%
- taxableRate = 118 / 1.18 = ₹100
- GST = ₹18

### 3.6 Product Operations

**Source:** `backend/controller/productController.js`, `backend/routes/productRoutes.js`

| Operation                | Endpoint                              | Method |
|--------------------------|---------------------------------------|--------|
| Add product              | `/v1/products/add`                    | POST   |
| Bulk add (replace all)   | `/v1/products/all`                    | POST   |
| Get all (admin, filtered)| `/v1/products/`                       | GET    |
| Get visible only         | `/v1/products/show`                   | GET    |
| Get storefront products  | `/v1/products/store`                  | GET    |
| Get by category          | `/v1/products/by-category`            | GET    |
| Get by ID                | `/v1/products/:id`                    | POST   |
| Get by slug              | `/v1/products/product/:slug`          | GET    |
| Update product           | `/v1/products/:id`                    | PATCH  |
| Bulk update              | `/v1/products/update/many`            | PATCH  |
| Toggle visibility        | `/v1/products/status/:id`             | PUT    |
| Update stock             | `/v1/products/stock/:id`              | PUT    |
| Update sort order        | `/v1/products/order/update`           | PUT    |
| Delete product           | `/v1/products/:id`                    | DELETE |
| Delete by category       | `/v1/products/by-category/:categoryId`| DELETE |
| Bulk delete              | `/v1/products/delete/many`            | PATCH  |

**Search:** Multi-word regex search across all language codes of `title`.

**Sorting:** By price (low/high), date (asc/desc), stock status.

**Storefront endpoint** (`/v1/products/store`) returns:
- `products` — paginated, visible, in-stock
- `popularProducts` — sorted by sales
- `discountedProducts` — where discount > 0
- `relatedProducts` — same category
- `reviews` — product reviews

---

## 4. Cart Logic

### 4.1 Cart Library

**Source:** `store/src/app/provider.js`

- **Library:** `react-use-cart`
- **Storage:** `localStorage` (key: `"react-use-cart"`)
- **No server-side cart** — fully client-side
- **Methods:** `addItem`, `updateItemQuantity`, `removeItem`, `emptyCart`
- **State:** `items`, `isEmpty`, `cartTotal`, `totalItems`

### 4.2 Add to Cart

**Source:** `store/src/hooks/useAddToCart.js`

**Flow:**
1. **Auth check** — reads `userInfo` cookie; redirects to `/auth/otp-login` if not logged in
2. **Stock validation** — checks `product.stock >= requestedQuantity`
3. **Legacy ID migration** — handles Number vs String ID mismatch from older data
4. **Quantity merge** — if item already in cart, merges quantities
5. **Promo time detection** — calls `checkIsPromoTime()` at add time
6. **Taxable rate calculation** — calls `getTaxableRate(product, quantity, isPromoTime)`

**Cart item structure:**
```javascript
{
  id: product._id,
  title: product.title,
  image: product.image[0],
  price: calculatedPrice,        // Based on quantity tier + promo time
  stock: product.stock,
  sku: product.sku,
  hsn: product.hsn,
  unit: product.unit,
  brand: product.brand,
  taxPercent: product.taxPercent,
  taxableRate: calculatedTaxableRate,
  originalPrice: product.prices.originalPrice,
  bulkPricing: product.bulkPricing,
  promoPricing: product.promoPricing,
  prices: product.prices,
  quantity: requestedQuantity
}
```

### 4.3 Cart Price Sync

**Source:** `store/src/hooks/useCartPriceSync.js`

**Purpose:** Dynamically update all cart prices when promo time changes (e.g., user adds items at 5:55 PM, promo starts at 6:00 PM).

**Mechanism:**
- Checks promo time every **10 seconds** (`setInterval`)
- When promo status changes → recalculates ALL cart item prices
- Debounced to 1-second minimum between syncs

**Price calculation priority:**

During promo time (6PM–9AM):
```
promoPricing.bulkRate2 → promoPricing.bulkRate1 → promoPricing.singleUnit → base price
```

Regular time (9AM–6PM):
```
bulkPricing.bulkRate2 → bulkPricing.bulkRate1 → base price
```

### 4.4 Taxable Rate Calculation

**Source:** `store/src/utils/pricing.js`

**`getActiveBulkTier(product, quantity, isPromoTime)`**
- Checks tiers in reverse order (highest first)
- Returns highest matching tier where `quantity >= tier.quantity`

**`getTaxableRate(product, quantity, isPromoTime)`**

Priority:
1. Active bulk tier's `taxableRate`
2. Promo `singleUnitTaxable` (if promo time)
3. Product-level `taxableRate`
4. Fallback formula: `price / (1 + taxPercent / 100)`

---

## 5. Checkout Flow

### 5.1 Overview

**Source:** `store/src/hooks/useCheckoutSubmit.js`

Steps:
1. Select/create shipping address (with pincode validation)
2. OTP verification of contact number
3. Apply coupon (optional)
4. Select payment method
5. Submit order

### 5.2 Address Management

**Source:** `store/src/hooks/useCheckoutSubmit.js`, `store/src/components/checkout/AddressManager.jsx`

- Multiple shipping addresses per customer (`shippingAddresses` array)
- Default address auto-selected
- Pincode validation: 6-digit Indian PIN codes checked against admin-managed `deliveryPincodes` list
- Auto-fill: city/state from India Post API on valid pincode
- Progressive profile: name/email collected at first address save
- Address synced to backend: `POST /v1/customer/shipping/address/:customerId`

**Address schema (embedded in Customer):**
```javascript
{
  name, outletName, contact, email,
  address, country, city, area, zipCode,
  isDefault: Boolean
}
```

**CRUD endpoints:**
| Operation       | Endpoint                                            | Method |
|-----------------|-----------------------------------------------------|--------|
| Add address     | `/v1/customer/shipping/address/:id`                 | POST   |
| Get all         | `/v1/customer/shipping/address/:id`                 | GET    |
| Update address  | `/v1/customer/shipping/address/:id/:addressId`      | PUT    |
| Set as default  | `/v1/customer/shipping/address/:id/:addressId/default` | PUT |
| Delete address  | `/v1/customer/shipping/address/:id/:addressId`      | DELETE |

### 5.3 Coupon Application

**Source:** `store/src/hooks/useCheckoutSubmit.js`

**Flow:**
1. User enters coupon code
2. Frontend fetches ALL coupons from `GET /v1/coupon/show`
3. Filters client-side by `couponCode` match
4. Validates: `endTime` not expired, `cartTotal >= minimumAmount`
5. `discountType`: `{ type: "fixed" | "percentage", value: Number }`
6. Coupon saved to cookie (`couponInfo`) and `UserContext`
7. Auto-removed if cart total drops below `minimumAmount`

### 5.4 Total Calculation

```
CartTotal       = sum(item.price × item.quantity)     ← from react-use-cart
ShippingCost    = 0 (always free delivery)
Discount        = fixed value  OR  (CartTotal × percentage / 100)
SubTotal        = CartTotal + ShippingCost

Per item:
  itemTaxable   = taxableRate × quantity
  itemGST       = (item.price × quantity) - itemTaxable

TotalGST        = sum(itemGST)
TaxableSubtotal = CartTotal - TotalGST
Total           = SubTotal - Discount
```

### 5.5 Order Submission

1. Saves/updates shipping address via API
2. Updates `userInfo` cookie with backend response
3. Dispatches `profileUpdated` custom event
4. Switches on `paymentMethod`: `"Cash"`, `"RazorPay"`, `"Card"`

**Order payload structure:**
```javascript
{
  user_info: { name, contact, email, address, city, country, zipCode, area },
  shippingOption: "string",
  paymentMethod: "Cash" | "Card" | "RazorPay",
  status: "pending",
  cart: items[],
  subTotal: Number,
  shippingCost: Number,
  discount: Number,
  total: Number,
  totalGst: Number,
  taxableSubtotal: Number,
  razorpay?: { razorpayPaymentId, razorpayOrderId, razorpaySignature, amount }
}
```

---

## 6. Payment Flows

### 6.1 Cash on Delivery (COD)

**Source:** `backend/controller/customerOrderController.js`

**Flow:**
1. `POST /v1/order/add` — direct order creation
2. No payment verification
3. Order status: `"pending"`
4. Admin manually updates: `pending → processing → delivered`

### 6.2 Razorpay Flow

**Source:** `backend/controller/customerOrderController.js`, `store/src/hooks/useCheckoutSubmit.js`

**Full Flow:**

```
Step 1: Frontend → POST /v1/order/create/razorpay { amount }
        Backend creates Razorpay order:
          - amount × 100 (convert to paise)
          - currency: "INR"
          - payment_capture: 1 (auto-capture)
        Returns: { id: razorpayOrderId, amount }

Step 2: Frontend opens Razorpay checkout modal
        Configuration:
          - UPI shown first (expanded)
          - Cards, NetBanking, Wallet, EMI, PayLater collapsed
          - Prefilled: customer name, email, phone

Step 3: Customer completes payment

Step 4: Safety net — POST /v1/order/pending-payment
        Saves payment details BEFORE order creation:
          { razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, orderInfo }
        Purpose: recover if Step 5 fails

Step 5: POST /v1/order/add/razorpay { orderData + razorpay details }
        Backend:
          a. Validates stock for all cart items
          b. Calculates GST (server-side recalculation)
          c. Generates invoice number (max existing + 1, starting at 10000)
          d. Saves Order document
          e. Marks PendingPayment as "recovered"
          f. Calls handleProductQuantity() to reduce stock
          g. Returns { orderId, invoice }

Step 6: Frontend sends invoice email to customer
        POST /v1/order/customer/invoice

Step 7: Redirect to /order/{orderId} (download/print)
```

**Razorpay credentials:** Read from DB (`storeSetting`) or env vars.

**On payment failure:** Saved to `PendingPayment` model with status `"failed"` for admin recovery.

### 6.3 Stripe Flow

**Source:** `backend/controller/customerOrderController.js`, `backend/lib/stripe/stripe.js`

```
Step 1: Frontend collects card via Stripe CardElement
Step 2: createPaymentMethod()
Step 3: POST /v1/order/create-payment-intent { amount, payment_method }
        Backend creates PaymentIntent:
          - Amount validated against MIN_AMOUNT / MAX_AMOUNT env vars
          - Stripe secret from DB (storeSetting) or STRIPE_KEY env var
        Returns: { clientSecret }
Step 4: confirmCardPayment(clientSecret)
Step 5: POST /v1/order/add { orderData + cardInfo }
Step 6: Same order creation flow as COD
```

### 6.4 Pending Payment Recovery

**Source:** `backend/models/PendingPayment.js`, `backend/controller/orderController.js`

**PendingPayment schema:**
```javascript
{
  razorpayPaymentId: String (required, unique),
  razorpayOrderId: String,
  razorpaySignature: String,
  amount: Number,
  orderInfo: Object,      // Full order data for recovery
  error: String,          // Error message from failed attempt
  status: "pending" | "recovered" | "failed" | "manual",
  recoveredOrderId: ObjectId,  // Ref to created Order
  notes: String
}
```

**Admin recovery:**
- `GET /v1/orders/pending-payments` — list all pending/failed payments
- `POST /v1/orders/pending-payments/:id/recover` — creates order from stored `orderInfo`, generates new invoice, reduces stock

**Admin page:** `store/src/app/admin/pending-payments/page.jsx`

### 6.5 PayPal (Configured, Not Active)

**Source:** `backend/lib/paypal/paypal.js`

- `createOrder()`, `capturePayment()`, `generateAccessToken()` implemented
- Not wired to any active route or frontend flow

---

## 7. Order Management

### 7.1 Order Schema

**Source:** `backend/models/Order.js`

| Field              | Type                | Notes                                         |
|--------------------|---------------------|-----------------------------------------------|
| `user`             | ObjectId (required) | Ref to Customer                               |
| `invoice`          | Number (unique)     | Auto-incremented from 10000                   |
| `cart`             | [Mixed]             | Full item snapshots at time of order          |
| `user_info`        | Object              | `{ name, email, contact, address, city, country, zipCode }` |
| `subTotal`         | Number              | Items total before discounts                  |
| `shippingCost`     | Number              | Shipping amount                               |
| `discount`         | Number              | Product savings + coupon discount             |
| `totalGst`         | Number              | Total GST amount                              |
| `taxableSubtotal`  | Number              | SubTotal minus GST                            |
| `vat`              | Number              | Alias for `totalGst`                          |
| `total`            | Number              | Final amount paid                             |
| `shippingOption`   | String              | Shipping method label                         |
| `paymentMethod`    | String              | `"cod"`, `"razorpay"`, `"stripe"`, etc.       |
| `cardInfo`         | Object              | Stripe card details                           |
| `razorpay`         | Object              | `{ razorpayPaymentId, razorpayOrderId, razorpaySignature, amount }` |
| `status`           | String              | `"pending"` \| `"processing"` \| `"delivered"` \| `"cancel"` |

### 7.2 Invoice Number Generation

**Source:** `backend/controller/customerOrderController.js`

```javascript
// Query max invoice number, increment by 1
const lastOrder = await Order.findOne({}).sort({ invoice: -1 });
const invoice = lastOrder ? lastOrder.invoice + 1 : 10000;
```

Starting value: **10000**

### 7.3 Stock Reduction

**Source:** `backend/lib/stock-controller/others.js` → `handleProductQuantity(cart)`

- Uses `Product.bulkWrite()` for batch update
- Per cart item:
  - Decrements `stock` by `item.quantity`
  - Increments `sales` by `item.quantity`
  - For combination products (`isCombination`): also updates `variants[].quantity`
- Called **AFTER** `order.save()` — not atomic with order creation

### 7.4 GST Calculation (Server-Side)

**Source:** `backend/controller/customerOrderController.js`

```javascript
// Per cart item:
itemTaxable = item.taxableRate
  ? item.taxableRate * item.quantity
  : (item.price * item.quantity) / (1 + (item.taxPercent || 0) / 100);

itemGST = (item.price * item.quantity) - itemTaxable;

// Order-level:
totalGst = sum(allItemGST);
taxableSubtotal = subTotal - totalGst;

// Discount includes:
productSavings = sum((originalPrice - currentPrice) * quantity);
totalDiscount = productSavings + couponDiscount;
```

### 7.5 Status Flow

```
pending → processing → delivered
pending → cancel
processing → cancel
```

All status transitions are manual by admin via `PUT /v1/orders/:id`.

### 7.6 Admin Order Operations

**Source:** `backend/controller/orderController.js`, `backend/routes/orderRoutes.js`

| Operation              | Endpoint                              | Method | Notes                              |
|------------------------|---------------------------------------|--------|------------------------------------|
| List all orders        | `/v1/orders/`                         | GET    | Filtered, paginated                |
| Get order by ID        | `/v1/orders/:id`                      | GET    |                                    |
| Get customer orders    | `/v1/orders/customer/:id`             | GET    |                                    |
| Update order           | `/v1/orders/:id`                      | PUT    | Status change, etc.                |
| Delete order           | `/v1/orders/:id`                      | DELETE |                                    |
| Dashboard orders       | `/v1/orders/dashboard`                | GET    | Overview stats                     |
| Recent orders          | `/v1/orders/dashboard-recent-order`   | GET    |                                    |
| Order count by status  | `/v1/orders/dashboard-count`          | GET    |                                    |
| Revenue by status      | `/v1/orders/dashboard-amount`         | GET    |                                    |
| Best sellers chart     | `/v1/orders/best-seller/chart`        | GET    | Top 4 products by quantity sold    |
| Pending payments       | `/v1/orders/pending-payments`         | GET    | Failed Razorpay transactions       |
| Recover payment        | `/v1/orders/pending-payments/:id/recover` | POST | Create order from pending payment |

**Filters:** status, date range, payment method, customer name/invoice search.

**Payment method totals:** Aggregated revenue by payment method for date-filtered reports.

### 7.7 Customer Order Retrieval

**Source:** `backend/controller/customerOrderController.js`

- `GET /v1/order/` — customer's own orders (paginated, 8 per page)
- Returns status counts: `{ pending, processing, delivered, cancel }`
- `GET /v1/order/:id` — specific order details

### 7.8 Dashboard Analytics

**`getDashboardOrders`:** Total orders, amounts, today's orders, monthly totals, pending/processing/delivered counts, weekly sale report.

**`getDashboardAmount`:** Total revenue, this month vs last month comparison, last 10 days order data.

**`getBestSellerProductChart`:** Top 4 products by quantity sold (MongoDB aggregation pipeline).

---

## 8. Post-Order Processing

### 8.1 Email Notifications

**Source:** `backend/lib/email-sender/sender.js`, `backend/lib/email-sender/templates/`

**SMTP config:** Gmail, port 465 (SSL), credentials from `EMAIL_USER` / `EMAIL_PASS` env vars.

**Emails sent:**

| Template                    | Trigger                  | Recipient      |
|-----------------------------|--------------------------|----------------|
| `order-to-customer`         | Order confirmation       | Customer email |
| `register`                  | Email registration       | Customer email |
| `forget-password`           | Password reset (15m link)| Customer email |
| `add-staff`                 | New staff account        | Staff email    |
| `support-message`           | Support inquiry          | Admin email    |

**Owner notification:** Order notification also sent to `team.horeca1@gmail.com`.

**Sent asynchronously** (fire-and-forget) to avoid blocking the API response.

### 8.2 Invoice PDF Generation

**Source:** `backend/lib/email-sender/create.js`

- **Library:** PDFKit
- **Format:** A4
- **Content:**
  - Header: Order status, VAT number, company info, logo
  - Customer info section
  - Line items table: product name, quantity, price
  - Footer: SubTotal, GST, Shipping, Discount, Total
- **Logo caching:** 1-hour TTL to avoid repeated downloads
- **Endpoint:** `POST /v1/order/customer/invoice` — sends PDF as email attachment

### 8.3 Frontend Invoice Features

**Source:** `store/src/app/(store)/order/[id]/page.jsx`

- **html-to-image** — converts invoice HTML to image
- **jsPDF** — generates downloadable PDF
- **react-to-print** — browser print functionality
- Download and print buttons on order confirmation page

### 8.4 Admin Notifications

**Source:** `backend/models/Notification.js`

```javascript
{
  orderId: ObjectId,    // Ref to Order (optional)
  productId: ObjectId,  // Ref to Product (optional)
  adminId: ObjectId,    // Ref to Admin (optional)
  message: String,      // Notification text
  image: String,        // URL (optional)
  status: "read" | "unread"
}
```

---

## 9. Categories

### 9.1 Schema

**Source:** `backend/models/Category.js`

| Field         | Type        | Notes                           |
|---------------|-------------|---------------------------------|
| `name`        | Object      | Multi-language                  |
| `description` | Object      | Multi-language                  |
| `slug`        | String      | URL-friendly                    |
| `parentId`    | String      | Always `null` (flat structure)  |
| `parentName`  | String      | Always `null`                   |
| `icon`        | String      | URL or icon identifier          |
| `status`      | String      | `"show"` or `"hide"`           |
| `order`       | Number      | Drag-drop sort position         |

### 9.2 Operations

**Source:** `backend/controller/categoryController.js`, `backend/routes/categoryRoutes.js`

| Operation          | Endpoint                     | Method |
|--------------------|------------------------------|--------|
| Add category       | `/v1/category/add`           | POST   |
| Bulk add (replace) | `/v1/category/add/all`       | POST   |
| Get visible        | `/v1/category/show`          | GET    |
| Get all            | `/v1/category/` or `/all`    | GET    |
| Get by ID          | `/v1/category/:id`           | GET    |
| Update             | `/v1/category/:id`           | PUT    |
| Toggle visibility  | `/v1/category/status/:id`    | PUT    |
| Update sort order  | `/v1/category/order/update`  | PUT    |
| Delete             | `/v1/category/:id`           | DELETE |
| Bulk delete        | `/v1/category/delete/many`   | PATCH  |
| Bulk update        | `/v1/category/update/many`   | PATCH  |

### 9.3 Frontend Display Format

Categories are wrapped for frontend compatibility:
```javascript
[{ _id: "root", name: "All Categories", children: [categories] }]
```

---

## 10. Coupons

### 10.1 Schema

**Source:** `backend/models/Coupon.js`

| Field          | Type    | Notes                                     |
|----------------|---------|-------------------------------------------|
| `title`        | Object  | Multi-language                            |
| `couponCode`   | String  | Unique code entered by customer           |
| `logo`         | String  | Image URL                                 |
| `startTime`    | Date    | Validity start                            |
| `endTime`      | Date    | Validity end                              |
| `discountType` | Object  | `{ type: "fixed"|"percentage", value: N }`|
| `minimumAmount`| Number  | Minimum cart value to apply               |
| `productType`  | String  | Scope: `"all"` or specific category       |
| `status`       | String  | `"show"` or `"hide"`                      |

### 10.2 Operations

| Operation          | Endpoint                   | Method |
|--------------------|----------------------------|--------|
| Add coupon         | `/v1/coupon/add`           | POST   |
| Bulk add           | `/v1/coupon/add/all`       | POST   |
| Get all            | `/v1/coupon/`              | GET    |
| Get active         | `/v1/coupon/show`          | GET    |
| Get by ID          | `/v1/coupon/:id`           | GET    |
| Update             | `/v1/coupon/:id`           | PUT    |
| Toggle visibility  | `/v1/coupon/status/:id`    | PUT    |
| Delete             | `/v1/coupon/:id`           | DELETE |
| Bulk update        | `/v1/coupon/update/many`   | PATCH  |
| Bulk delete        | `/v1/coupon/delete/many`   | PATCH  |

### 10.3 Application Flow

1. Frontend fetches all active coupons
2. User enters code → client-side filter by `couponCode`
3. Validates: `endTime` not expired, `cartTotal >= minimumAmount`
4. Discount calculated: fixed value or `(cartTotal × percentage / 100)`
5. Stored in `UserContext` + cookie (`couponInfo`, 30-day expiry)
6. Applied during order submission → `order.discount`
7. No per-user usage limits
8. **No server-side coupon validation on order creation**

---

## 11. Reviews & Ratings

### 11.1 Schema

**Source:** `backend/models/Review.js`

| Field     | Type               | Notes                         |
|-----------|--------------------|-------------------------------|
| `product` | ObjectId (required)| Ref to Product                |
| `user`    | ObjectId (required)| Ref to Customer               |
| `rating`  | Number (1–5)       | Required                      |
| `comment` | String             |                               |
| `images`  | [String]           | Image URLs                    |

**Unique index:** `(product, user)` — one review per product per customer.

### 11.2 Operations

**Source:** `backend/controller/reviewController.js` — all routes require `isAuth`

| Operation               | Endpoint                        | Method |
|-------------------------|---------------------------------|--------|
| Add review              | `/v1/reviews/`                  | POST   |
| Update own review       | `/v1/reviews/`                  | PUT    |
| Delete own review       | `/v1/reviews/:id`               | DELETE |
| Get product reviews     | `/v1/reviews/:productId`        | GET    |
| Get purchased products  | `/v1/reviews/purchased-products`| GET    |

### 11.3 Auto-Rating Update

When a review is added/updated/deleted:
```javascript
// Aggregation pipeline on Review collection
const result = await Review.aggregate([
  { $match: { product: productId } },
  { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
]);
Product.updateOne({ _id: productId }, {
  average_rating: result.avg,
  total_reviews: result.count
});
```

### 11.4 Purchased Products Display

`GET /v1/reviews/purchased-products`:
- Returns products from **delivered** orders only
- Split 50/50: `reviewedList` + `notReviewedList`
- Deduplicates by product ID
- Paginated (limit/2 per category)

---

## 12. Settings System

### 12.1 Architecture

**Source:** `backend/models/Setting.js`, `backend/controller/settingController.js`

Single `Setting` model with `name` (string) + `setting` (schemaless Object).

Three documents:
1. `globalSetting` — shop info, currency, timezone
2. `storeSetting` — payment method toggles, integrations
3. `storeCustomizationSetting` — UI customization

**Seed endpoint:** `GET /seed-settings` — creates defaults if missing.

### 12.2 Global Settings

```javascript
{
  number_of_image_per_product: 2,
  shop_name: "Horeca1",
  address: "...",
  company_name: "...",
  vat_number: "...",
  post_code: "...",
  contact: "...",
  email: "...",
  website: "...",
  default_currency: "$",
  default_time_zone: "Indian Standard Time",
  default_date_format: "MMM D, YYYY"
}
```

### 12.3 Store Settings

```javascript
{
  // Payment methods
  cod_status: "show",              // Cash on Delivery enabled
  stripe_status: "hide",           // Stripe disabled by default
  razorpay_status: "hide",         // Razorpay disabled by default

  // Social login
  google_login_status: "hide",
  facebook_login_status: "hide",
  github_login_status: "hide",

  // Analytics & chat
  tawk_chat_status: "hide",
  google_analytic_status: "hide",
  fb_pixel_status: "hide",

  // Secrets (stored in same document)
  razorpay_id: "...",
  razorpay_secret: "...",
  stripe_key: "...",
  google_client_id: "...",
  google_secret: "..."
}
```

**Endpoints:**

| Operation                    | Endpoint                                        | Method |
|------------------------------|-------------------------------------------------|--------|
| Get global settings          | `/v1/setting/global-setting`                    | GET    |
| Create global settings       | `/v1/setting/add-global-setting`                | POST   |
| Update global settings       | `/v1/setting/update-global-setting`             | PUT    |
| Get store settings           | `/v1/setting/store-setting`                     | GET    |
| Create store settings        | `/v1/setting/add-store-setting`                 | POST   |
| Update store settings        | `/v1/setting/update-store-setting`              | PUT    |
| Get customization settings   | `/v1/setting/store-customization-setting`       | GET    |
| Update customization settings| `/v1/setting/update-store-customization-setting`| PUT    |

### 12.4 Store Customization Settings

```javascript
{
  navbar: {
    categories_menu_status: "show",
    about_menu_status: "show",
    contact_menu_status: "show",
    offers_menu_status: "show",
    help_text: "...",
    phone: "..."
  },
  home: {
    coupon_status: "show",
    featured_status: "show",
    popular_status: "show",
    quick_delivery_status: "show",
    discounted_status: "show",
    daily_needs_status: "show"
  },
  slider: { left_right_arrow: "show", bottom_dots: "show" },
  footer: {
    social_links: { facebook: "...", twitter: "...", instagram: "..." },
    payment_method_status: "show",
    bottom_contact_status: "show"
  },
  seo: {
    meta_title: "...",
    meta_description: "...",
    meta_keywords: "...",
    meta_url: "..."
  }
}
```

---

## 13. Additional Entities

### 13.1 Banners

**Source:** `backend/models/Banner.js`, `backend/controller/bannerController.js`

| Field         | Type    | Notes                |
|---------------|---------|----------------------|
| `image`       | String  | Desktop image URL    |
| `mobileImage` | String  | Mobile image URL     |
| `order`       | Number  | Sort position        |
| `isActive`    | Boolean | Visibility toggle    |

**Admin page:** `store/src/app/admin/banners/page.jsx`

### 13.2 Languages

**Source:** `backend/models/Language.js`

| Field    | Type               | Notes                       |
|----------|--------------------|-----------------------------|
| `name`   | String             | Display name (e.g., "English") |
| `code`   | String (unique)    | ISO code: `en`, `bn`, `ar`  |
| `flag`   | String             | Emoji or image URL           |
| `status` | String             | `"show"` or `"hide"`        |

Used for multi-language `title` and `description` fields across Product, Category, Coupon, Admin models.

Frontend: `next-translate` library for i18n.

### 13.3 Currencies

**Source:** `backend/models/Currency.js`

| Field                | Type    | Notes                          |
|----------------------|---------|--------------------------------|
| `name`               | String  | e.g., "US Dollar"             |
| `symbol`             | String  | e.g., "$", "₹"               |
| `status`             | String  | `"show"` or `"hide"`          |
| `live_exchange_rates` | String | `"show"` or `"hide"`          |

### 13.4 Attributes (Product Variants)

**Source:** `backend/models/Attribute.js`

| Field      | Type                  | Notes                              |
|------------|-----------------------|------------------------------------|
| `title`    | Object                | Multi-language                     |
| `name`     | Object                | Multi-language                     |
| `variants` | [{ name, status }]    | Options (e.g., sizes, colors)      |
| `option`   | String                | `"radio"`, `"dropdown"`, `"checkbox"` |
| `type`     | String                | `"attribute"` or `"extra"`         |
| `status`   | String                | `"show"` or `"hide"`              |

---

## 14. Customer Management

### 14.1 Customer Schema

**Source:** `backend/models/Customer.js`

| Field                | Type                 | Notes                              |
|----------------------|----------------------|------------------------------------|
| `name`               | String (optional)    | Collected at first checkout        |
| `email`              | String (optional)    | NOT unique — allows duplicates     |
| `phone`              | String (required)    | UNIQUE, indexed — primary ID       |
| `password`           | String (optional)    | Not needed for OTP users           |
| `image`              | String               |                                    |
| `address`            | String               |                                    |
| `country`            | String               |                                    |
| `city`               | String               |                                    |
| `zipCode`            | String               |                                    |
| `outletName`         | String               | HORECA business/outlet name        |
| `shippingAddresses`  | [Object]             | Array of saved addresses           |

### 14.2 Shipping Address Sub-Schema

```javascript
{
  name: String,
  outletName: String,
  contact: String,
  email: String,
  address: String,
  country: String,
  city: String,
  area: String,
  zipCode: String,
  isDefault: Boolean
}
```

### 14.3 Admin Customer Operations

| Operation              | Endpoint                       | Method |
|------------------------|--------------------------------|--------|
| Get all customers      | `/v1/customer/`                | GET    |
| Get by ID              | `/v1/customer/:id`             | GET    |
| Admin create (no verify)| `/v1/customer/admin/create`   | POST   |
| Bulk add (replace all) | `/v1/customer/add/all`         | POST   |
| Update customer        | `/v1/customer/:id`             | PUT    |
| Delete customer        | `/v1/customer/:id`             | DELETE |

**Admin page:** `store/src/app/admin/customers/page.jsx`

### 14.4 Pincode Management

**Source:** `store/src/app/admin/pincodes/page.jsx`

Admin manages a list of serviceable delivery PIN codes. Stored and used to validate delivery addresses at checkout (client-side check against stored pincode list).

---

## 15. Infrastructure

### 15.1 Database Connection

**Source:** `backend/config/db.js`

- MongoDB Atlas connection via `MONGO_URI`
- Database name forced to `"horeca1"` regardless of URI
- Pool: `maxPoolSize: 10`, `minPoolSize: 1`
- Timeouts: `serverSelectionTimeoutMS: 30000`, `socketTimeoutMS: 45000`
- Buffering disabled for serverless compatibility
- `ensureDBConnection` middleware on all data routes → 503 if connection fails

### 15.2 Rate Limiting

| Endpoint Type         | Limit               | Source                      |
|-----------------------|---------------------|-----------------------------|
| Email verification    | 3 per 30 minutes    | `emailVerificationLimit`    |
| Password reset        | 3 per 30 minutes    | `passwordVerificationLimit` |
| Phone verification    | 2 per 30 minutes    | (phone verification)        |
| Support messages      | 5 per 30 minutes    | (support)                   |
| **All other endpoints** | **No rate limiting** | —                          |

### 15.3 Security Middleware

**Source:** `backend/api/index.js`

- `helmet()` — HTTP security headers
- `cors()` — **All origins allowed** (no restriction)
- `express.json({ limit: "4mb" })` — JSON body parser
- `trust proxy` enabled for rate limiting behind reverse proxy

### 15.4 Protected Routes

| Route Prefix          | Middleware                  |
|-----------------------|-----------------------------|
| `/v1/order/`          | `ensureDBConnection`, `isAuth` |
| `/v1/orders/`         | `ensureDBConnection`, `isAuth` |
| `/v1/reviews/`        | `ensureDBConnection`, `isAuth` |
| `/v1/currency/`       | `ensureDBConnection`, `isAuth` |
| `/v1/notification/`   | `ensureDBConnection`, `isAuth` |
| All other `/v1/*`     | `ensureDBConnection` only   |

### 15.5 Frontend Analytics

**Source:** `store/src/lib/analytics.js`, `store/src/utils/analytics.js`

- **Google Analytics 4:** `view_item`, `add_to_cart`, `begin_checkout`, `purchase` events
- **Facebook Pixel:** Page views and conversion tracking
- Toggled via store settings (`google_analytic_status`, `fb_pixel_status`)

### 15.6 Third-Party Integrations Summary

| Service        | Purpose              | Config Source               |
|----------------|----------------------|-----------------------------|
| Razorpay       | Payment gateway      | DB (storeSetting) or env    |
| Stripe         | Payment gateway      | DB (storeSetting) or env    |
| PayPal         | Payment gateway      | Env vars (not active)       |
| MSG91          | OTP/SMS              | Env vars                    |
| Twilio         | SMS fallback         | Env vars                    |
| Cloudinary     | Image upload/storage | Frontend env vars           |
| Gmail SMTP     | Email delivery       | Env vars                    |
| India Post API | Pincode lookup       | Public API                  |
| Tawk.to        | Live chat widget     | Store settings              |

---

## 16. Flaws & Improvements

### 16.1 CRITICAL Security Issues

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| JWT tokens expire in **365 days** | `backend/config/auth.js` | Stolen token usable for a year | Reduce to 15m access + 7d refresh with rotation |
| Default admin password `"12345678"` hardcoded | `backend/models/Admin.js` schema default | Any new admin has known password | Remove default, require password on creation |
| `isAdmin` middleware checks if ANY admin exists with role `"Admin"` | `backend/config/auth.js` | Does not verify the requesting user is an admin | Check the decoded token's user ID against Admin collection |
| **No Razorpay signature verification** | `backend/controller/customerOrderController.js` | Signature is stored but **never verified** — anyone can forge payment | Verify signature using `crypto.createHmac('sha256', secret)` |
| CORS allows **all origins** | `backend/api/index.js` | Any website can make API requests | Whitelist specific domains |
| Payment secrets stored in MongoDB **unencrypted** | `backend/models/Setting.js` (storeSetting) | DB breach exposes Razorpay/Stripe secrets | Encrypt secrets at rest or use vault |
| OTP returned in API response in dev/fallback mode | `backend/lib/msg91/otp-service.js` | OTP visible in network tab | Never return OTP in response, even in dev |
| `.env.example` contains **real MongoDB credentials** | `backend/.env.example` | Public repo exposure → full DB access | Replace with placeholder values |
| `getStoreSecretKeys` returns all secrets to any authenticated admin | `backend/controller/settingController.js` | Cashier role can see payment keys | Restrict to super admin only |

### 16.2 Data Integrity Issues

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| Invoice number: `max(invoice) + 1` — **race condition** | `customerOrderController.js` | Concurrent orders can get same invoice number | Use MongoDB `$inc` on a counter document or `mongoose-sequence` |
| Stock reduction happens **after** `order.save()` | `customerOrderController.js` → `handleProductQuantity` | If bulkWrite fails, order exists but stock not reduced | Wrap in transaction or reduce stock atomically with order |
| **No stock reservation** during checkout | Cart logic | Two users can buy the last item simultaneously | Add temporary stock reservation (TTL-based) |
| `addAllProducts` **deletes ALL** then re-inserts | `productController.js` | Data loss if insert fails mid-way | Use upsert/bulk upsert instead |
| `addAllCustomers` **deletes ALL** then re-inserts | `customerController.js` | Same as above | Use upsert |
| Customer email is **NOT unique** | `backend/models/Customer.js` | Duplicate accounts, confusion | Add sparse unique index on email |
| **No soft delete** for any model | All models | Deleted data unrecoverable | Add `isDeleted` flag + `deletedAt` timestamp |

### 16.3 Cart & Checkout Issues

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| Coupon validation is **client-side only** | `useCheckoutSubmit.js` | Users can bypass coupon rules via API | Validate coupon server-side on order creation |
| **No per-user coupon usage limits** | Coupon model/logic | Same user can reuse coupon unlimited times | Add `usageCount` per user tracking |
| Cart stored in **localStorage only** | `react-use-cart` | Lost on browser clear, no cross-device sync | Add server-side cart sync |
| Promo time check every **10 seconds** | `useCartPriceSync.js` | Aggressive polling | Increase to 30–60 seconds |
| GST values can be **overridden by frontend** | `customerOrderController.js` | Client can manipulate tax amounts | Always recalculate server-side, ignore client values |
| No minimum order value enforcement | Checkout logic | Orders of any amount accepted | Add configurable minimum order amount |
| All coupons fetched to frontend for client-side matching | `useCheckoutSubmit.js` | Exposes all coupon codes | Validate via `POST /v1/coupon/verify` server-side endpoint |

### 16.4 Architecture Issues

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| OTP stored in **in-memory Map** | `backend/lib/msg91/otp-service.js` | Lost on server restart, fails with multiple instances | Move to Redis or MongoDB with TTL index |
| **No request validation** middleware | All controllers | Malformed requests can cause crashes | Add Zod/Joi validation on all endpoints |
| Mixed naming conventions | Models and controllers | Inconsistency (`camelCase` + `snake_case`) | Standardize to one convention |
| Socket.io imported but barely used | `backend/api/index.js` | Dead code, unnecessary dependency | Remove or implement properly |
| Debug logs with hardcoded Windows paths | Various controllers | Log noise in production | Remove or use proper logging library (Winston/Pino) |
| No API error standardization | All controllers | Inconsistent error shapes | Use standard `{ success, message, data, error }` format |

### 16.5 Performance Issues

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **No caching layer** | Entire backend | Every request hits DB | Add Redis for settings, categories, products |
| Product search uses `$regex` | `productController.js` | Slow on large collections | Use MongoDB text index with `$text` search |
| No pagination default enforcement | Some controllers | Endpoints can return all records | Add max page size limit (e.g., 100) |
| `getAllCustomers` returns ALL without pagination | `customerController.js` | Memory issues with large customer base | Add pagination |
| No image optimization pipeline | Cloudinary usage | Raw image URLs, no responsive sizes | Use Cloudinary transforms for responsive images |
| Email sent synchronously in some flows | `customerOrderController.js` | Blocks API response | Always use fire-and-forget pattern |

### 16.6 Missing Features

| Feature | Business Impact | Priority |
|---------|-----------------|----------|
| **Order cancellation by customer** | Customers can't cancel their own orders | High |
| **Refund flow** | No way to process refunds for any payment method | High |
| **Razorpay webhooks** | No server-side payment confirmation; relies on client callback | High |
| **Low stock alerts** | Admin unaware when products run out | Medium |
| **Wishlist** | No save-for-later functionality | Medium |
| **Order tracking / shipping integration** | No delivery tracking for customers | Medium |
| **Audit log** for admin actions | No record of who did what | Medium |
| **Bulk order / quote request** | Missing B2B feature for HORECA | Medium |
| **Email verification for OTP users** | OTP users never verify email | Low |
| **Two-factor auth for admin** | Single-factor admin login | Low |
| **API key management** for B2B integrations | No programmatic access for business clients | Low |

### 16.7 Recommended Priority Fixes

**P0 — Fix Immediately:**
1. Verify Razorpay payment signatures on order creation
2. Fix `isAdmin` middleware to check the actual requesting user
3. Reduce JWT expiry (15m access + 7d refresh with rotation)
4. Remove real credentials from `.env.example`

**P1 — Fix Soon:**
5. Add server-side coupon validation on order creation
6. Add input validation (Zod) on all API endpoints
7. Move OTP storage from in-memory to Redis/MongoDB
8. Make invoice number generation atomic (counter document)
9. Add Razorpay webhook handler for payment confirmation
10. Restrict CORS to known domains

**P2 — Plan For:**
11. Add Redis caching for settings, categories, products
12. Implement stock reservation during checkout
13. Add order cancellation and refund flow
14. Use MongoDB text indexes for product search
15. Add soft delete across all models

**P3 — Nice To Have:**
16. Server-side cart sync
17. Low stock alerts
18. Admin audit log
19. Standardize API error responses
20. Add proper logging (Winston/Pino)

---

## Appendix: Environment Variables

### Backend (`backend/.env`)

```
PORT=5055
MONGO_URI=mongodb+srv://...

# JWT
JWT_SECRET=...
JWT_ACCESS_LIFETIME=365d
JWT_REFRESH_SECRET=...
JWT_REFRESH_LIFETIME=365d
JWT_SECRET_FOR_VERIFY=...
ENCRYPT_PASSWORD=...          # 32-digit hex for AES-256-CBC

# Stripe
STRIPE_KEY=...
MAX_AMOUNT=...
MIN_AMOUNT=...

# Email (Gmail SMTP)
SERVICE=gmail
EMAIL_USER=...
EMAIL_PASS=...                # 16-digit app password
HOST=smtp.gmail.com
EMAIL_PORT=465

# URLs
STORE_URL=...
ADMIN_URL=...
```

### Frontend (`store/.env`)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5055/v1
NEXT_PUBLIC_API_SOCKET_URL=http://localhost:5055
NEXT_PUBLIC_STRIPE_KEY=...
NEXT_PUBLIC_CLOUDINARY_URL=...
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
NEXT_PUBLIC_STORE_DOMAIN=http://localhost:3000/
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
NEXT_PUBLIC_TEST_HOUR=10      # Override promo time for testing
```
