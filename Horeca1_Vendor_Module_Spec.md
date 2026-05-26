# Horeca1 — Vendor Module: Full Technical Specification
**Version:** 1.0 | **Document Type:** Product & Engineering Spec  
**Audience:** Product Managers, Engineers, UI/UX Designers, Claude Code  
**Purpose:** Complete, implementation-ready description of the Horeca1 Vendor Module — covering all flows, data models, states, rules, and UX behaviour.

---

## Table of Contents

1. [Core Philosophy & Product Identity](#1-core-philosophy--product-identity)
2. [Vendor Types Supported](#2-vendor-types-supported)
3. [High-Level Vendor Journey](#3-high-level-vendor-journey)
4. [Vendor Onboarding & KYC](#4-vendor-onboarding--kyc)
5. [First-Time Setup Wizard](#5-first-time-setup-wizard)
6. [Vendor Dashboard (Home Screen)](#6-vendor-dashboard-home-screen)
7. [Staff Role Management & RBAC](#7-staff-role-management--rbac)
8. [Vendor Storefront Management](#8-vendor-storefront-management)
9. [Product Catalog Management](#9-product-catalog-management)
10. [Bulk Upload & Bulk Update Engine](#10-bulk-upload--bulk-update-engine)
11. [Inventory Management](#11-inventory-management)
12. [Brand Store + Distributor Mapping Engine](#12-brand-store--distributor-mapping-engine)
13. [Customer Mapping Engine](#13-customer-mapping-engine)
14. [Pricing & Scheme Engine](#14-pricing--scheme-engine)
15. [Credit Management Module](#15-credit-management-module)
16. [Collections & Recovery Module](#16-collections--recovery-module)
17. [Order Management Flow](#17-order-management-flow)
18. [Partial Fulfillment](#18-partial-fulfillment)
19. [Picking, Packing & Dispatch](#19-picking-packing--dispatch)
20. [Delivery Management](#20-delivery-management)
21. [Returns, Shortages & Claims](#21-returns-shortages--claims)
22. [Invoice Engine](#22-invoice-engine)
23. [Ledger & Reconciliation](#23-ledger--reconciliation)
24. [Vendor Wallet & Settlement Engine](#24-vendor-wallet--settlement-engine)
25. [Reporting & Analytics](#25-reporting--analytics)
26. [Notification Center](#26-notification-center)
27. [Search & Discovery Controls](#27-search--discovery-controls)
28. [Promotion Engine](#28-promotion-engine)
29. [Vendor CRM Layer](#29-vendor-crm-layer)
30. [ERP & Accounting Integrations](#30-erp--accounting-integrations)
31. [Mobile-First Requirements](#31-mobile-first-requirements)
32. [Future Roadmap (Phase 2 & 3)](#32-future-roadmap-phase-2--3)
33. [UX Principles](#33-ux-principles)
34. [Must-Have Feature Checklist](#34-must-have-feature-checklist)

---

## 1. Core Philosophy & Product Identity

### What Horeca1 Vendor Module IS

The Vendor Module is not merely an e-commerce seller panel. It is a **full Vendor Operating System** combining:

| Layer | What it Does |
|---|---|
| **Wholesale Commerce Engine** | B2B catalog, pricing, ordering |
| **Procurement & Order Management** | Accept, edit, fulfil, dispatch |
| **Credit & Recovery Layer** | Vendor-backed credit, freeze, collection |
| **Customer Acquisition Engine** | Discovery, mapping, CRM |
| **Primary + Secondary Sales Distribution** | Brand → Distributor → Customer |

### The Analogy

> Think: **Shopify + Hyperpure + Vyapar + ERP-lite + Credit Control Layer**

For many vendors, Horeca1 should eventually become _"the software through which they run their entire wholesale business."_

---

## 2. Vendor Types Supported

The entire architecture must support all five vendor types without breaking any flow:

### 2.1 Standard Distributor
- Stocks inventory in own warehouse
- Sells directly to B2B customers (hotels, restaurants, cafes)
- Full order acceptance and fulfillment cycle applies

### 2.2 Wholesaler
- Large SKU catalog (can be 5,000–20,000 SKUs)
- Regional pricing configurations
- Bulk logistics and volume-based pricing slabs

### 2.3 Brand Store
- Brand-controlled storefront (e.g., a beverage brand)
- May NOT directly fulfill orders
- Maps products to authorized distributors
- Enables **primary sales visibility** (brand → distributor)
- Enables **secondary sales** via mapped distributor storefronts
- Can run brand-wide schemes, campaigns, and incentives
- Demand capture flows to distributor for fulfillment

### 2.4 Manufacturer
- Can sell direct to customers
- Can route through distributor-assisted sales
- Can handle institutional/bulk sales separately

### 2.5 Dark Store / Fulfillment Partner
- Inventory holding node (not customer-facing storefront)
- Delivery-driven; receives orders routed from Brand Stores or other vendors
- Operations focus: picking, packing, dispatching

---

## 3. High-Level Vendor Journey

Two main loops:

### Loop 1 — Onboarding to Go-Live
```
Vendor Signs Up
  → Mobile OTP / Email Verification
  → Business Type Selection
  → Basic Details Entry
  → GST & PAN Submission
  → Bank Details
  → Pickup / Warehouse Address
  → Serviceable Pincodes
  → KYC Document Upload
  → Horeca1 Approval Queue
  → [Approved] → Setup Wizard → Storefront Goes Live
```

### Loop 2 — Operations (Repeat Cycle)
```
Customer Orders
  → Vendor Accepts / Edits / Rejects
  → Fulfillment (Full or Partial)
  → Invoice Generated
  → Settlement Calculated
  → Ledger Reconciliation
  → Collections & Recovery (if credit used)
  → Repeat Orders & Customer Retention
```

### Payment Options Per Customer
Each customer can be assigned a custom payment method:
- Cash on Delivery (COD)
- Pay by Cheque
- Pay via DiSCCO (future integration)
- Pay via Vendor Credit Limit

### Credit Setup Flow
```
Vendor → Credit Tab → Customer List
  → Select Customer
  → Fill Credit Limit (₹ amount)
  → Choose Payment Terms (e.g. Bill Date + 15 Days)
  → Configure Interest & Penalty T&Cs
  → Choose Optional Payment Methods for this customer
  → Save
```

---

## 4. Vendor Onboarding & KYC

### 4.1 Registration Flow (New Vendor)

```
Step 1: Entry Point
  → Mobile Number Entry
  → OTP Verification (6-digit, 2 min expiry, resend after 30s)
  OR
  → Email Entry → Email Verification Link

Step 2: Business Type Selection
  → Dropdown / Radio: Standard Distributor / Wholesaler / Brand Store / Manufacturer / Dark Store

Step 3: Basic Business Details (see data fields below)

Step 4: GST & PAN
  → GST Number (auto-fetch business name from GSTIN API if possible)
  → PAN Number

Step 5: Bank Details
  → Account Holder Name
  → Account Number
  → IFSC Code
  → Bank Name (auto-fill from IFSC)
  → Account Type (Current / Savings)

Step 6: Pickup / Warehouse Address
  → Address Line 1, Line 2
  → City, State, Pincode
  → Google Maps Pin (optional but recommended)

Step 7: Serviceable Pincodes
  → Multi-entry field for pincodes
  → Or upload CSV of pincodes

Step 8: KYC Document Upload
  → GST Certificate
  → PAN Card
  → Bank Cancelled Cheque / Bank Statement
  → Optional: FSSAI, Udyam, CIN, Drug License

Step 9: Submission
  → "Submit for Review" CTA
  → Status: "Under Review"
  → Vendor receives WhatsApp / Email / SMS confirmation
```

### 4.2 Mandatory Onboarding Data Fields

| Field | Type | Notes |
|---|---|---|
| Business Name | Text | Legal name |
| Trade Name | Text | DBA name |
| Vendor Type | Enum | See §2 |
| Mobile Number | Phone | Primary contact |
| Email | Email | Login credential |
| GST Number | Text (15 chars) | Auto-verify format |
| PAN | Text (10 chars) | |
| Billing Address | Address Object | Full address |
| Pickup Address | Address Object | Warehouse / pickup point |
| Bank Details | Object | Account, IFSC, name |
| Authorized Person | Text | Name + designation |
| Delivery Capability | Boolean | Self-delivery or platform |
| Serviceable Pincodes | Array of strings | |

### 4.3 Optional Fields (Completable Later)

- Brand Logo & Banner Image
- Product Catalog Upload
- Delivery Schedule (days + time slots)
- MOQ Rules
- Credit Rules
- Delivery Charges
- Staff Users
- Return Policy
- FSSAI License
- Udyam Certificate
- CIN (Company Identification Number)

### 4.4 Horeca1 Approval Flow

```
Vendor Submits Application
  → Enters Horeca1 Internal Verification Queue
  → Admin Reviews:
      - KYC documents
      - GST validity
      - PAN match
      - Bank account details
  → Admin takes action:
      ✅ Approve → Vendor notified → Store activated
      ❌ Reject → Vendor notified with reason
      ⏳ Request More Info → Vendor notified → Resubmit flow
      ⏸ Temporarily Suspend → Access paused
      🚫 Blacklist → Permanent ban with reason logged
```

**Admin Actions Available:**
- Approve
- Reject (with mandatory rejection reason)
- Request More Information (with specific fields flagged)
- Temporarily Suspend
- Blacklist

**Vendor Notification Channels:** WhatsApp + Email + SMS + App Push

---

## 5. First-Time Setup Wizard

Triggered immediately after first login post-approval.

### Wizard Flow & Sections

```
Welcome Screen → [Start Setup]
  ↓
Section 1: Upload Logo & Banner
  - Logo: Square format recommended, min 200×200px
  - Banner: 1200×400px recommended
  ↓
Section 2: Configure Store Timing
  - Operating hours (open/close time)
  - Days of operation (Mon–Sun toggles)
  ↓
Section 3: Configure Delivery Days
  - Which days do you deliver?
  - Cut-off time for same-day order acceptance
  ↓
Section 4: Add Delivery Charges
  - Free delivery above ₹ X
  - Flat fee below threshold
  - Per-km slab (if self-delivery)
  ↓
Section 5: Configure Tax Defaults
  - Default GST % if product-level GST not set
  ↓
Section 6: Upload Products
  - Option A: Add manually (1 by 1)
  - Option B: Bulk upload via Excel template
  ↓
Section 7: Configure Inventory
  - Initial stock quantities per SKU
  ↓
Section 8: Configure Customer Credit
  - Enable/disable credit for store
  - Set default credit terms
  ↓
Section 9: Add Staff Users
  - Add staff with name, mobile, role
  ↓
Section 10: Enable Payment Modes
  - COD, Cheque, Credit, DiSCCO (toggle each)
  ↓
Section 11: Preview Store
  - Read-only preview of storefront as customer sees it
  ↓
Section 12: Go Live
  - [Go Live] button
  - Confirmation modal
  - Store published
```

**UX Rule:** Progress bar is mandatory. Vendor must always see what % of setup is complete. Sections can be skipped (except mandatory ones) and completed later from dashboard.

---

## 6. Vendor Dashboard (Home Screen)

### Philosophy
> The dashboard is the **"Today's Operations Control Center"** — not a reports page, not a home screen. It answers: "What do I need to do RIGHT NOW?"

### Dashboard Widgets

#### Sales Widgets
- Today's Sales (₹)
- Month-to-Date Sales (₹)
- Pending Orders (count + ₹ value)
- Delivered Orders Today (count)
- Cancelled Orders Today (count)

#### Collections Widgets
- Pending Payments (₹)
- Overdue Payments (₹ + count of customers)
- Upcoming Due Payments (next 7 days, ₹)
- Total Credit Utilization (₹ / total limit %)

#### Inventory Widgets
- Low Stock Alerts (count of SKUs)
- Out-of-Stock Items (count)
- Fast Moving Items (top 5 SKUs)

#### Customer Widgets
- Active Customers (ordered in last 30 days)
- New Customers (joined in last 7 days)
- Dormant Customers (no order in 30+ days)
- Credit Customers (count using credit)

#### Fulfillment Widgets
- Orders Pending Acceptance (actionable, most urgent)
- Packing Pending
- Dispatch Pending
- Delivery Delayed (SLA breach)

#### Financial Widgets
- Wallet Balance (₹)
- Settlement Pending (₹)
- Settlement Completed This Month (₹)
- Platform Fees This Month (₹)

#### Smart Actions (Quick Action Buttons)
- Add Products
- Upload Inventory
- Create Scheme
- Push Offer
- Send Payment Reminder (bulk)
- Download Reports

### Dashboard UX Rules
- Widgets refresh in real-time (WebSocket or polling every 30s)
- Clicking any widget navigates to the relevant detail screen
- "Orders Pending Acceptance" widget must be most visually prominent
- Mobile: cards stack vertically; most urgent at top

---

## 7. Staff Role Management & RBAC

> **Note to Engineers:** Refer to the dedicated HCID + RBAC document for full permission matrix. This section provides the Vendor Module-specific layer.

### Roles

| Role | Description |
|---|---|
| Owner | Full access; cannot be revoked |
| Admin | Near-full access; set by Owner |
| Sales Manager | Customer management, order visibility |
| Accounts | Ledger, collections, settlements |
| Picker/Packer | Order view + picklist only |
| Delivery Manager | Dispatch, delivery tracking |
| Store Operator | Order acceptance + basic operations |
| Catalog Manager | Product + inventory management |
| Credit Manager | Credit limits, credit approval |

### Permission Matrix (Configurable Per Role)

| Permission | Owner | Admin | Sales Mgr | Accounts | Picker | Delivery Mgr | Store Op | Catalog Mgr | Credit Mgr |
|---|---|---|---|---|---|---|---|---|---|
| View Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Orders | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Cancel Orders | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Edit Pricing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Access Ledger | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve Credit | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Download Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage Inventory | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Access Customer Data | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |

**UX:** Vendor (Owner) can toggle individual permissions per staff member, overriding the role defaults. All permission changes are audit-logged.

---

## 8. Vendor Storefront Management

### What Is the Vendor Store?
The Vendor Store is the **buyer-facing interface** where customers browse, discover, and order. It must be:
- Mobile-first
- Fast-loading (even on 4G)
- Wholesale-appropriate (show case quantities, MOQ, slabs)

### Store Header Section
| Element | Details |
|---|---|
| Vendor Name | Primary store identity |
| Rating | Aggregate rating (stars + count) |
| Delivery Timings | e.g. "Orders accepted until 6 PM" |
| Delivery Days | e.g. "Mon, Wed, Fri" |
| Credit Available Badge | Shows if vendor offers credit to this customer |
| Minimum Order Value | e.g. "Min order ₹500" |
| Delivery Charge | e.g. "Free above ₹1000" or flat ₹X |
| Brand Badges | Logos of brands stocked |
| WhatsApp Button | **IMPORTANT: VISIBLE ONLY IN HORECA1 BACKEND VIEW. NOT visible to customers or vendors. Only for Horeca1 internal messaging.** |
| My Order Lists | Customer's saved order lists |

### Banner Section
- Hero Banner (primary promotional image)
- Offers Banner
- Schemes Banner
- Seasonal Promotions Banner
- Banners are vendor-configurable, Horeca1-approvable

### Catalog Navigation
- Categories (Level 1)
- Sub-Categories (Level 2)
- Frequently Ordered (personalized to this customer)
- Deals (price-marked items)
- New Arrivals
- Bulk Deals (case/pallet pricing)

### Product Card (in Grid View)
Each product card must show:

| Field | Notes |
|---|---|
| Product Image | First image; swipeable for more |
| Product Name | Full name |
| Pack Size | e.g. "12 × 500ml" |
| Unit | e.g. Case, Kg, Litre |
| MRP | Market Retail Price (strikethrough) |
| Selling Price | Price to this customer (may vary) |
| Bulk Slab Pricing | e.g. "₹X for 5+, ₹Y for 10+" |
| GST % | Shown explicitly |
| MOQ | Minimum order quantity |
| Available Stock | Real-time (or "In Stock" / "Limited" / "Out of Stock") |
| Credit Eligible Badge | If vendor has enabled this SKU for credit |
| Add to Cart | Primary CTA |
| Save to Order List | Secondary action |
| Share Product | Share via WhatsApp / link |

---

## 9. Product Catalog Management

### Critical Scale Requirement
The system must handle:
- Vendors with 20 SKUs
- Vendors with 20,000 SKUs

No performance degradation at scale.

### Product Creation Flow
```
Vendor → Products → Add Product
  → Fill all fields (see below)
  → Upload Images
  → Set Pricing
  → Set Inventory
  → Save as Draft OR Publish
```

### Full Product Data Fields

#### Identity Fields
| Field | Type | Required | Notes |
|---|---|---|---|
| Product Name | Text | ✅ | |
| Alias Names | Array of Text | ❌ | Search aliases |
| Brand | Dropdown | ✅ | From brand master |
| Category | Dropdown | ✅ | Level 1 |
| Sub-Category | Dropdown | ✅ | Level 2 |
| Additional Categories | Multi-select | ❌ | Cross-list in other categories |
| SKU Code | Text | ✅ | Vendor's internal code |
| Barcode | Text | ❌ | EAN-13 / GTIN |
| Product Description | Rich Text | ❌ | |

#### Compliance Fields
| Field | Type | Required | Notes |
|---|---|---|---|
| HSN Code | Text | ✅ | For GST invoicing |
| GST Rate | Enum | ✅ | 0%, 5%, 12%, 18%, 28% |
| Country of Origin | Dropdown | ❌ | |
| Veg / Non-Veg | Enum | ❌ | Green/Red dot indicator |
| Shelf Life | Number (days) | ❌ | |
| Storage Type | Enum | ❌ | Ambient / Refrigerated / Frozen |
| FSSAI Reference | Text | ❌ | |

#### Packaging & Quantity Fields
| Field | Type | Required | Notes |
|---|---|---|---|
| Unit Type | Enum | ✅ | Case / Piece / Kg / Litre / Box / Carton |
| Pack Size | Text | ✅ | e.g. "12×500ml" |
| MOQ | Number | ✅ | Minimum order quantity |
| Bulk Quantity Slabs | Array of {qty, price} | ❌ | Tiered pricing |

#### Media Fields
| Field | Type | Notes |
|---|---|---|
| Product Images | Multi-image upload | Max 6 images; first = primary |

#### Mapping Fields
| Field | Type | Notes |
|---|---|---|
| Variant Mapping | Link to parent SKU | e.g. "500ml variant of X" |
| Substitute Mapping | Link to alternate SKUs | Shown if this item OOS |

---

## 10. Bulk Upload & Bulk Update Engine

### 10.1 Bulk Product Upload

This is a **critical feature**. Vendors with 500+ SKUs cannot manually add products one by one.

#### Upload Flow
```
Vendor → Products → Bulk Upload
  → Step 1: Download Excel Template
  → Step 2: Fill Template (see columns below)
  → Step 3: Upload Filled File (.xlsx or .csv)
  → Step 4: System Validates File
      - Format errors flagged (wrong column, missing mandatory field)
      - Duplicate SKU detection
      - GST/HSN format validation
  → Step 5: Error Report Generated
      - Downloadable error report with row numbers + error descriptions
      - Rows with errors listed clearly
      - Valid rows count shown
  → Step 6: Vendor Reviews Errors
  → Step 7: Confirm Import
      - Import valid rows now, fix errors and re-upload
  → Step 8: Products imported, visible in catalog
```

#### Excel Template Columns

**Core Columns (Mandatory)**

| Column | Format | Notes |
|---|---|---|
| Product Name | Text | |
| SKU Code | Text | Unique per vendor |
| Brand | Text | Must match brand master |
| Category | Text | Must match category master |
| Sub-Category | Text | |
| HSN Code | Text | |
| GST Rate | Number | 0, 5, 12, 18, or 28 |
| Unit Type | Enum Text | Case/Piece/Kg/Litre/Box |
| Pack Size | Text | |
| Selling Price | Number | ₹ |
| Stock Quantity | Number | |
| MOQ | Number | |

**Advanced Columns (Optional)**
| Column | Format | Notes |
|---|---|---|
| MRP | Number | |
| Product Description | Text | |
| Slab 1 Qty | Number | Bulk pricing slab 1 |
| Slab 1 Price | Number | |
| Slab 2 Qty | Number | |
| Slab 2 Price | Number | |
| Customer-Specific Price: [CustomerID] | Number | One column per customer |
| Region Pricing: [Region] | Number | |
| Credit Eligible | Y/N | |
| Shelf Life (days) | Number | |
| Storage Type | Enum | Ambient/Refrigerated/Frozen |
| Veg/Non-Veg | V/NV | |
| Country of Origin | Text | |
| Search Aliases | Pipe-separated text | e.g. "cola|coke|cold drink" |
| Image URL 1–6 | URL | Direct image URLs |
| Barcode | Text | |
| Substitute SKU | Text | Another SKU code |

### 10.2 Bulk Update Engine

> **Critical principle:** Vendor must NEVER need to edit items one by one for mass updates.

#### What Can Be Bulk Updated?

**Pricing Updates**
- Increase price by X%
- Decrease price by X%
- Set exact price (replace)
- Filter: by category, by brand, by customer, or all
- Update customer-specific pricing in bulk

**GST Updates**
- Change GST rate by SKU list
- Bulk GST correction across catalog

**Inventory Updates**
- Stock quantity sync (upload new quantities)
- Warehouse-specific stock updates
- Batch stock adjustment

**Product Status Updates**
- Mark as Active
- Mark as Inactive (hidden from store)
- Seasonal disable (set date range for auto-disable)

**Offer / Deal Updates**
- Set deal prices
- Set combo pricing
- Set discount windows (start/end date)

**Credit Eligibility**
- Mark items credit-eligible in bulk
- Mark items as not eligible for credit

#### Bulk Update UX Flow
```
Vendor → Products → Bulk Update
  → Choose Update Type (pricing / inventory / status / offers / credit)
  → Choose Scope (all / by category / by brand / upload SKU list)
  → Enter update parameters
  → Preview changes (show before/after for sample 10 rows)
  → Confirm → System applies update
  → Success report: X items updated, Y failed (with reasons)
```

---

## 11. Inventory Management

### Inventory States Per SKU

| State | Description |
|---|---|
| Available Stock | Ready to sell |
| Reserved Stock | Held against accepted orders not yet dispatched |
| In Transit Stock | Dispatched but not delivered |
| Damaged Stock | Received damaged, not sellable |
| Returned Stock | Customer returns, pending decision |

### Inventory Flow
```
Initial Upload → Available Stock set
  → Customer Places Order
  → Stock Reserved (deducted from Available, added to Reserved)
  → Order Accepted by Vendor
  → Picking & Packing begins
  → Dispatch → moves to In Transit
  → Delivered → Reserved/In Transit cleared
  → If returned → Returned Stock bucket
```

### Advanced Inventory Features

| Feature | Description |
|---|---|
| Multi-Warehouse Support | Stock tracked per warehouse location |
| Batch-wise Inventory | Track by batch number (for expiry management) |
| Expiry Tracking | FEFO (First Expiry First Out) picking logic |
| Auto Stock Sync | API-based sync with vendor's ERP/WMS |
| Low Stock Alerts | Alert when stock < configured threshold per SKU |
| Auto Disable Out-of-Stock | SKU auto-hidden from store when stock = 0 |
| Substitute Suggestions | When OOS, system suggests mapped substitute SKUs |

### Inventory Upload
- Single SKU update from product edit screen
- Bulk upload via Excel (SKU + new quantity columns)
- API sync (for ERP-integrated vendors)

---

## 12. Brand Store + Distributor Mapping Engine

### What This Solves
A brand (e.g., a beverages company) wants to:
1. Have their own branded storefront on Horeca1
2. Show their full catalog and run campaigns
3. But NOT directly fulfill orders (they route through distributors)

### Brand Mapping Flow
```
Brand Store Setup
  → Brand adds products to their catalog
  → Brand selects each product
  → Brand maps authorized distributors for that product
  → Brand configures geography (which distributor serves which pincode)
  → Brand configures priority logic (which distributor is preferred)

Customer Journey
  → Customer visits Brand Store on Horeca1
  → Customer adds products to cart
  → Customer's pincode + order details evaluated
  → Routing engine selects distributor
  → Order routed to distributor's system
  → Distributor fulfills order
  → Invoice may come from distributor (or brand — configurable)
```

### Distributor Routing Logic

The system routes orders to distributors based on (in priority order, configurable per brand):

1. **Pincode Match** — Is this distributor serviceable in customer's pincode?
2. **Inventory Availability** — Does the distributor have stock?
3. **Customer Mapping** — Is this customer already mapped to a specific distributor?
4. **Distributor Priority** — Brand-set priority ranking
5. **Brand Rules** — Brand-specific override rules
6. **Price Competitiveness** — Lowest price distributor (if brand allows)
7. **Delivery SLA** — Fastest delivery option
8. **Credit Availability** — Does distributor offer credit to this customer?

**If no distributor matches:** Customer sees "Not available in your area" or is prompted to request availability.

### Brand Visibility Features
- Brand can see **primary sales data** (how much sold via brand store)
- Brand can see **secondary sales data** (how much distributors sold)
- Brand can run **schemes and incentives** that apply across all mapped distributors
- Brand can see **sell-through rates** per distributor per region

---

## 13. Customer Mapping Engine

### What This Is
Vendors want control over which customers can see and order from their store, and at what terms.

### Mapping Modes

| Mode | Description |
|---|---|
| Open Store | Any verified Horeca1 customer can order |
| Approval Required | Customer requests access; vendor approves/rejects |
| Invite Only | Vendor explicitly invites customers |
| Territory-Based | Customers from specific pincodes only |
| Salesman-Linked | Customer linked to a specific sales executive |

### Customer Management Actions (Per Customer)

| Action | Description |
|---|---|
| Approve Customer | Allow ordering |
| Block Customer | Deny ordering (with reason) |
| Assign Price List | Give this customer a specific price list |
| Assign Sales Executive | Link to vendor's salesperson |
| Assign Credit Limit | Set credit amount (see §15) |
| Assign Delivery Route | Which route/day serves this customer |
| Assign Custom Catalog | Show only specific SKUs to this customer |

### Customer Groups
Vendors can create customer groups (e.g., "5-star Hotels", "QSR Chains") and apply bulk settings to groups.

---

## 14. Pricing & Scheme Engine

### Price List Types

| Type | Description |
|---|---|
| Global Pricing | Default price; applies to all customers |
| Customer-Specific Pricing | Individual customer override |
| Group Pricing | Price list for a customer group |
| Brand Pricing | Different price if buying brand-specific catalog |
| Area / Region Pricing | Different prices for different geographies |
| Quantity / Slab Pricing | Price breaks based on order quantity |

### Slab Pricing Example
```
Product: Mineral Water 500ml (Case of 24)
  1–4 Cases: ₹480/case
  5–9 Cases: ₹460/case
  10+ Cases: ₹440/case
```

### Price Priority Resolution (when multiple apply)
```
Customer-Specific Price > Group Price > Area Price > Global Price
(Slab pricing applies on top of whichever base price is resolved)
```

---

## 15. Credit Management Module

### Purpose
Formalize the informal wholesale credit system that currently runs on trust, WhatsApp messages, and paper. This module bridges the gap before the full **DiSCCO** financial integration.

### Vendor-Backed Credit Flow

```
Vendor → Credit Tab
  → Customer List shown
  → Select Customer
  → Fill:
      - Credit Limit (₹ amount)
      - Credit Terms (see below)
      - Interest Rate (% per day or per month)
      - Grace Period (days before interest starts)
      - Auto-Freeze Rules (days overdue before freeze)
      - Hard Block Rules (days overdue before block)
  → Optional: Restrict credit to certain product categories
  → Save → Customer notified of credit availability
```

### Credit Terms Options

| Term Type | Example |
|---|---|
| Bill Date + Credit Days | Bill Date + 7 Days |
| Bill Date + Credit Days | Bill Date + 15 Days |
| Bill Date + Credit Days | Bill Date + 30 Days |
| Monthly Consolidated | All May invoices consolidated, due June 15 |
| Weekly Settlement | Every Friday |
| Custom | Vendor defines custom rule |

### Credit Rule Engine (Per Customer Configuration)

| Rule | Description |
|---|---|
| Max Credit Exposure | ₹ cap on total outstanding |
| Product/Category Exclusions | Certain SKUs not eligible for credit |
| Overdue Threshold | Days past due before action |
| Grace Period | Configurable; 0–30 days typical |
| Auto-Freeze Rule | Auto-freeze account at X days overdue |
| Interest Rules | Daily % or monthly % interest on overdue |
| Hard Block Rule | No orders allowed at Y days overdue |

### Customer Credit Experience (Buyer Perspective)

**On entering Vendor Store:**
A banner shows:
- "Credit Available: ₹15,000"
- "Amount Due: ₹8,500"
- "Next Due Date: June 5, 2025"

**At Checkout:**
- Option: "Pay via Vendor Credit" (shows available limit)
- Option: "Split Payment" (partial credit + partial cash)
- Option: "Pay Now" (COD/online)

### Credit Account States

| State | Description | Effect |
|---|---|---|
| Active | No overdue | Can order normally |
| Warning | Due date approaching (< 3 days) | Banner warning shown |
| Frozen | Overdue; temporary freeze | Cannot place new orders |
| Blocked | Hard block; significantly overdue | Cannot place orders; recovery mode |
| Recovery | Payment plan in progress | Partial ordering may be allowed |

### State Transitions

```
Active
  → (due date approaching) → Warning
  → (X days overdue, configurable) → Frozen
  → (Y days overdue, configurable) → Blocked
  → (payment received) → Active [reactivated]
  → (negotiated plan) → Recovery
```

### Interest & Penalty Engine

When overdue:
1. **Day 0 of grace period expiry:** Interest clock starts
2. **Daily interest accrual:** Applied at configured rate (e.g., 0.05%/day)
3. **Penalty auto-calculated:** Shown on customer ledger
4. **Notifications triggered:** Customer notified daily or per configured frequency
5. **Account freeze triggered:** At X days overdue
6. **Escalation reminders:** WhatsApp + SMS + in-app

**Configurable parameters:**
- Interest % (daily or monthly)
- Grace period (days)
- Freeze trigger (days overdue)
- Hard block trigger (days overdue)

---

## 16. Collections & Recovery Module

### Vendor Dashboard — Collections View

The Vendor sees:
- Total outstanding balance (across all credit customers)
- Due today (₹ + customer list)
- Overdue (₹ + customer list, with aging)
- High-risk customers (flagged based on history)

### Aging Buckets

| Bucket | Description |
|---|---|
| Current | Not yet due |
| 1–7 days overdue | Early overdue |
| 8–15 days overdue | Moderate overdue |
| 16–30 days overdue | High risk |
| 30+ days overdue | Critical / Recovery |

### Collection Actions Available to Vendor

| Action | Description |
|---|---|
| Send Payment Reminder | Automated WhatsApp/SMS with outstanding amount |
| Send WhatsApp Payment Link | Customer clicks to pay online |
| Download Statement | PDF statement for customer |
| Download Ledger | Full transaction ledger for customer |
| Mark Offline Collection | Record cash/cheque payment received offline |
| Add Collection Notes | Internal notes on collection attempts |
| Add Dispute | Flag a disputed invoice |
| Initiate Recovery Plan | Structured repayment schedule |

### Offline Collection Recording
```
Vendor → Collections → Select Customer → Mark as Paid
  → Enter Amount
  → Select Mode: Cash / Cheque / NEFT / UPI
  → Enter Reference (cheque no., UTR)
  → Date of Collection
  → Save → Ledger updated → Customer notified
```

---

## 17. Order Management Flow

### Order States (Complete List)

| State | Description |
|---|---|
| Pending Approval | Customer placed order; awaiting vendor action |
| Accepted | Vendor accepted fully |
| Edited | Vendor modified quantities/items |
| Packing | In warehouse, being picked and packed |
| Ready for Dispatch | Packed, awaiting pickup/delivery assignment |
| Out for Delivery | Assigned to delivery agent, en route |
| Delivered | Successfully delivered (with proof) |
| Cancelled | Cancelled by vendor or customer |
| Returned | Return initiated post-delivery |
| Partially Delivered | Some items delivered; balance pending/cancelled |

### Order Acceptance Flow

```
Customer Places Order
  → Vendor receives notification (App + WhatsApp + SMS)
  → Vendor opens order
  → Vendor reviews line items, quantities, stock availability
  → Vendor chooses:

  Option A: Accept Fully
    → Order status → Accepted
    → Customer notified instantly
    → Inventory reserved

  Option B: Reject Fully
    → Must provide rejection reason
    → Customer notified instantly
    → Inventory NOT reserved

  Option C: Edit Order
    → Vendor can:
        - Edit quantities (reduce, not increase beyond customer request)
        - Remove unavailable items
        - Replace items with mapped substitutes
        - Change delivery date (if stock expected later)
    → Customer notified of changes instantly
    → Customer can confirm or cancel edited order

  Option D: Partial Accept + Back Order
    → Fulfil available items now
    → Back-order remaining items for later
    → Customer notified of partial acceptance
```

**SLA for Acceptance:** Configurable. Default: Vendor must accept/reject within 2 hours of order placement. After SLA breach, vendor receives escalation notification.

---

## 18. Partial Fulfillment

### Why It's Critical
Wholesale distributors routinely face stock shortages for specific SKUs. The system must handle this gracefully, not force a binary accept/reject.

### Partial Fulfillment Flow

```
Customer Places Order (10 SKUs, ₹15,000)
  → Vendor reviews stock
  → Vendor partially accepts:
      - 7 SKUs available → Accept (₹11,000)
      - 2 SKUs out of stock → Remove from this dispatch
      - 1 SKU under-stocked → Reduce quantity (customer ordered 10 cases, vendor ships 6)
  → Customer notified of partial acceptance (item-wise breakdown)
  → Customer confirms (or cancels the whole order)
  → Partial Invoice Generated (₹11,000 invoice)
  → Balance: Remaining 3 items → options:
      A: Cancelled (customer re-orders later)
      B: Back-ordered (vendor will fulfil in next dispatch)
      C: Customer chooses substitute SKUs
```

### Partial Fulfillment Must Support

- **Item-wise fulfillment**: Each line item can be independently accepted/rejected
- **Quantity-wise fulfillment**: Each line item can be partially fulfilled (e.g., 6 of 10 cases)
- **Backorders**: System tracks backordered items; vendor can fulfil later with a second dispatch
- **Replacement suggestions**: System auto-suggests mapped substitute SKUs
- **Multiple dispatches on one order**: Order can have Dispatch 1 (Day 1) and Dispatch 2 (Day 3)
- **Multiple delivery schedules**: Each dispatch has its own delivery date/slot

### Partial Fulfillment Invoicing
- Separate invoice per dispatch
- Master order shows all linked invoices
- Credit/payment applied per dispatch invoice

---

## 19. Picking, Packing & Dispatch

### Picking & Packing Flow

```
Order Accepted
  → System generates Picklist
  → Picklist assigned to Picker staff member
  → Picker goes to warehouse with picklist (app or printed)
  → Picks each item:
      - Scans barcode OR manually confirms
      - System checks expiry if batch tracking enabled (FEFO)
  → All items picked → Packing begins
  → Packer arranges items in box/crate
  → Quality Check:
      - Weight check
      - Count check
      - Damage check
  → Packing confirmed in system
  → Order status → "Ready for Dispatch"
  → Delivery assignment triggered
```

### Picklist Format
The picklist must show:
- Order ID and customer name
- Each line item: SKU, name, quantity to pick, warehouse location (if bin system)
- Batch/expiry info (if batch tracking enabled)
- Special instructions (fragile, refrigerate, etc.)
- Check-off boxes for each item

---

## 20. Delivery Management

### Delivery Modes Supported

| Mode | Description |
|---|---|
| Self Delivery | Vendor's own delivery staff |
| Third-Party Logistics | Integrated 3PL partners |
| Route Delivery | Fixed route; multiple drops per vehicle |
| Slot Delivery | Customer selects delivery time slot |
| Scheduled Delivery | Future date delivery |

### Delivery Configuration
```
Vendor → Settings → Delivery
  → Select delivery modes available
  → Configure delivery days
  → Configure slots (if slot delivery)
  → Configure delivery zones (pincode-wise)
  → Set delivery charges per zone
  → Configure driver/delivery staff
  → Configure vehicle types
```

### Delivery Flow

```
Order → Ready for Dispatch
  → Assign to delivery executive (manual or auto-route assignment)
  → Route planning (for multi-drop routes)
  → Driver receives notification on delivery app
  → Driver marks "Out for Delivery"
  → En route tracking (GPS, if driver app enabled)
  → At customer location:
      → Customer OTP verification (OTP sent to customer's mobile)
      → Or: Customer signature capture
      → Or: Photo proof of delivery
      → Geo-tag recorded
  → Delivery confirmed
  → Order status → Delivered
  → Invoice finalized
  → Customer notified
```

### Delivery Proof Methods

| Method | Description |
|---|---|
| OTP Verification | 4-digit OTP sent to customer; driver enters it |
| Signature Capture | Digital signature on driver's device |
| Photo Proof | Driver photos delivered goods at customer site |
| Geo-tagging | GPS coordinates recorded at delivery confirmation |
| Delivery Notes | Driver can add notes (e.g., "Left at reception") |

**Delivery SLA Breach:** If delivery is delayed beyond configured SLA, auto-alert sent to Delivery Manager and vendor admin.

---

## 21. Returns, Shortages & Claims

### Return/Claim Scenarios Supported

| Scenario | Trigger |
|---|---|
| Damaged Goods | Customer receives damaged items |
| Missing Items | Short delivery (fewer items than invoiced) |
| Rejected Items | Customer refuses items on delivery (quality) |
| Expiry Claims | Items delivered past or near expiry |
| Quality Disputes | Items not as described |

### Return Flow

```
Customer Raises Issue (app or via salesman)
  → Customer selects order
  → Selects affected items
  → Selects issue type (damaged / missing / rejected / expiry / quality)
  → Uploads photo evidence (optional but encouraged)
  → Submits claim

Vendor Reviews Claim
  → Sees claim details and evidence
  → Takes action:
      ✅ Approve Claim → choose resolution:
          A: Pickup & Replacement (collect damaged, send fresh)
          B: Credit Note (deduct from next invoice)
          C: Refund (reverse payment)
          D: Partial Resolution (partial credit/replacement)
      ❌ Reject Claim → must provide reason → Customer notified
      ⏳ Request More Information → Customer submits more evidence

Ledger Adjustment
  → Approved claims automatically adjust the customer's ledger
  → Credit note issued if applicable
  → Replacement dispatch created if pickup+replacement chosen
```

---

## 22. Invoice Engine

### Invoice Types Supported

| Invoice Type | Use Case |
|---|---|
| GST Invoice | Standard B2B invoice with GSTIN |
| Delivery Challan | Dispatch note (no payment liability) |
| Credit Note | Adjustment against approved return/claim |
| Debit Note | Adjustment against under-charged items |
| Partial Invoice | For partial fulfillment dispatches |
| Multi-Dispatch Invoice | Each dispatch on one order gets separate invoice |
| E-Invoice | (Phase: Currently vendor adds E-Way Bill details manually) |

### Invoice Data Fields

```
Invoice Header:
  - Invoice Number (sequential, GST-compliant format)
  - Invoice Date
  - Vendor Details: Name, GSTIN, Address
  - Customer Details: Name, GSTIN, Address
  - Place of Supply
  - E-Way Bill Number (if vendor provides)

Line Items:
  - Product Name
  - HSN Code
  - Quantity + Unit
  - Unit Price
  - Discount (if any)
  - Taxable Value
  - CGST, SGST, IGST (as applicable)
  - Total per line

Invoice Footer:
  - Sub-total
  - Total Discount
  - Total Tax (CGST + SGST or IGST)
  - Delivery Charges
  - Grand Total (₹)
  - Amount in Words
  - Payment Terms
  - Bank Details (for NEFT/RTGS payment)
  - QR Code (UPI payment link)
  - Authorized Signature
```

### Invoice Generation Trigger
Invoice auto-generated at:
- Order status changes to "Delivered" (for delivered orders)
- Partial dispatch confirmed (for partial invoices)
- Manual trigger by vendor (for advance invoicing)

---

## 23. Ledger & Reconciliation

### Why This Is Critical
The ledger is the **core trust layer** between vendor and customer. Both sides must always agree on the numbers. It must be accurate, real-time, and downloadable.

### What the Vendor Ledger Tracks

#### Sales Side
- Order Value
- Tax (CGST / SGST / IGST)
- Discounts / Schemes applied
- Delivery Charges

#### Collections Side
- Payments Received (online, offline, cheque, UPI)
- Adjustments
- Refunds

#### Credit Side
- Credit Utilized (per customer)
- Interest Accrued
- Penalties Applied
- Overdue amounts

#### Platform Side (Horeca1 charges)
- Commission (% of GMV)
- Platform Fees
- Logistics Fees (if Horeca1 delivery used)
- Settlement Deductions

### Vendor-Horeca1 Reconciliation

Vendor must always know:
| Item | Description |
|---|---|
| Gross Sales | Total order value invoiced |
| Net Receivable | Gross - returns - claims |
| Platform Fees | Horeca1's commission |
| Payment Gateway Charges | % deducted by PG |
| Settlements Completed | Paid out to vendor |
| Settlements Pending | Yet to be paid out |
| Credit Outstanding | Total customer credit not yet collected |

### Reconciliation Flow

```
Orders Completed (delivered + invoiced)
  → Settlement Calculation:
      Gross Order Value
      - Returns & Claims
      - Platform Commission
      - Payment Gateway Charges
      - Any pending deductions
      = Net Settlement Amount
  → Vendor Wallet Updated (amount available for payout)
  → Settlement Released (per configured payout cycle: daily/weekly)
  → Ledger Entry Created for every transaction
  → Vendor can view/download full statement at any time
```

---

## 24. Vendor Wallet & Settlement Engine

### Wallet Functions
| Function | Description |
|---|---|
| Settlement Balance | Funds available for payout |
| Refund Adjustments | Customer refunds processed through wallet |
| Credit Adjustments | Platform credits (e.g., promotions) |
| Promotional Credits | Horeca1 cashback or incentives |
| Platform Deductions | Commission, fees deducted |

### Payout Management — What Vendor Sees

| View | Description |
|---|---|
| Upcoming Payouts | What will be paid out and when |
| Settlement History | Past payouts with dates and amounts |
| Pending Deductions | Items being deducted from next settlement |
| Failed Settlements | Payouts that failed (bank error, etc.) |
| Bank Transfer Logs | NEFT/IMPS transfer references |

### Settlement Cycle Options
- Daily settlement
- Weekly settlement
- Biweekly settlement
- On-demand settlement (with minimum threshold)

---

## 25. Reporting & Analytics

### Sales Analytics
| Report | Description |
|---|---|
| Daily Sales | Revenue by day with trend |
| Weekly Sales | Week-over-week comparison |
| Monthly Sales | Month-over-month, YoY |
| Category Sales | Which product categories generate most revenue |
| Brand Sales | Which brands sell most |
| Top SKUs | Best-selling products |
| Fast Movers | Highest velocity products |
| Slow Movers | Low-velocity products (inventory risk) |

### Customer Analytics
| Report | Description |
|---|---|
| Repeat Customers | Customers who re-ordered |
| Dormant Customers | No order in 30/60/90 days |
| High Value Customers | Top customers by revenue |
| Credit Customers | Summary of all credit customers |
| Average Order Value | Mean order size |
| Order Frequency | How often customers order |

### Credit Analytics
| Report | Description |
|---|---|
| Outstanding Exposure | Total credit outstanding |
| Aging Buckets | Distribution across 0-7, 8-15, 16-30, 30+ day buckets |
| Collection Efficiency | % of due amounts collected on time |
| Default Trends | Month-over-month default rate |
| Risk Scoring | High/medium/low risk customers |

### Inventory Analytics
| Report | Description |
|---|---|
| Stock Turnover | How fast inventory moves |
| Dead Stock | Items with zero movement in 30+ days |
| Low Stock Report | Items approaching stockout |
| Expiry Risk | Batches expiring in next 30 days |
| Fill Rate | % of ordered items actually fulfilled |

### Export Options
- All reports downloadable as Excel / CSV / PDF
- Date range selectable
- Customer/brand/category filter applicable

---

## 26. Notification Center

### Notification Triggers & Templates

| Trigger | Channel | Recipient |
|---|---|---|
| New Order Placed | App Push + WhatsApp + SMS | Vendor |
| Order Acceptance SLA nearing | App Push + WhatsApp | Vendor |
| Payment Received | App Push + SMS | Vendor |
| Overdue Alert | App Push + WhatsApp + SMS | Vendor |
| Stock Level Low | App Push | Vendor |
| Delivery Delayed | App Push + SMS | Vendor |
| Customer Signup (new customer mapped) | App Push | Vendor |
| Return Request Raised | App Push + WhatsApp | Vendor |
| Settlement Processed | App Push + SMS + Email | Vendor |

### Notification Channels

| Channel | Use Case |
|---|---|
| In-App (Push) | All events; real-time |
| SMS | Critical events (new order, overdue) |
| WhatsApp | Preferred for India; orders + collections |
| Email | Statements, settlement reports |
| In-App Notification Center | All event history; readable |

### Vendor Notification Preferences
- Vendor can configure which channels are active for each event type
- "Do Not Disturb" hours configurable
- Role-based notification routing (e.g., overdue alerts go to Accounts role only)

---

## 27. Search & Discovery Controls

### Vendor Controls Over Discoverability
| Control | Description |
|---|---|
| Featured Products | Pin specific SKUs to top of category pages |
| Deal Banners | Create banner for sale/offer items |
| Sponsored Visibility | Pay for better placement (if platform enables) |
| Priority SKUs | Mark 10–20 items as priority (shown prominently) |
| Seasonal Collections | Create themed collections (e.g., "Monsoon Essentials") |
| New Arrivals | Flag newly added products for 14 days |

---

## 28. Promotion Engine

### Promotion Types

| Promotion | Description | Example |
|---|---|---|
| Buy X Get Y | Volume-linked gift | Buy 10 cases, get 1 free |
| Combo Offer | Bundle deal | Buy A + B at ₹X (cheaper than individually) |
| Bulk Discount | % off on quantity | 5% off on orders above 20 cases |
| Time-Bound Deal | Flash sale | 10% off today only |
| Category Discount | % off on a category | 8% off all beverages this week |
| Customer-Specific Scheme | Special offer for a customer | Loyalty discount for top 10 customers |

### Promotion Configuration
```
Vendor → Promotions → Create New
  → Select Promotion Type
  → Select Applicable SKUs / Categories / Customers
  → Set Conditions (min qty, min value, specific SKU)
  → Set Benefit (% off, ₹ off, free item)
  → Set Start Date + End Date
  → Set Usage Limit (optional)
  → Preview
  → Publish
```

---

## 29. Vendor CRM Layer

### Purpose
Replace informal WhatsApp-based customer relationship management with a structured in-app CRM.

### CRM Features

| Feature | Description |
|---|---|
| Customer Notes | Free-text notes per customer (e.g., "Prefers delivery before 10 AM") |
| Customer Tags | Labels like "VIP", "New Customer", "Risk", "Large Account" |
| Conversation Tracking | Log of communications sent/received |
| Follow-Up Reminders | Set reminder: "Call John on June 5 re: overdue" |
| Sales Visit Tracking | Log in-person visit outcomes |
| Task Creation | Assign tasks to sales staff |
| Customer History | Full order + payment + credit history in one view |

---

## 30. ERP & Accounting Integrations

### Supported Integrations (Roadmap)

| System | Integration Type | Priority |
|---|---|---|
| Tally | Accounting export | High |
| Zoho Books | API sync | High |
| Busy Accounting | Export | Medium |
| Marg ERP | Export/import | Medium |
| Vyapar | API sync | High |
| SAP | API (for large vendors) | Low |

### API Support (For ERP-Integrated Vendors)

| API | Description |
|---|---|
| Inventory Sync API | Push/pull stock levels |
| Order API | Receive orders in vendor's system |
| Catalog API | Sync product catalog from vendor's ERP |
| Pricing Sync | Keep prices in sync with ERP |
| Accounting Export | Download journal entries / vouchers |

### Standard Export Formats
- Excel (XLSX)
- CSV
- JSON
- PDF

---

## 31. Mobile-First Requirements

### Context
Most Indian wholesale vendors operate from their phones. The mobile experience must be optimized, not a scaled-down afterthought.

### Core Mobile Actions (Must Work Seamlessly on Phone)

| Action | Notes |
|---|---|
| Accept Orders | With single tap; edit quantities inline |
| Edit Quantities | Large touch targets; not desktop-style inputs |
| Manage Inventory | Update stock; camera-based barcode scan |
| Upload Products | Photo from camera; fill fields on mobile |
| Check Collections | Overdue view; one-tap reminder send |
| View Ledgers | Scrollable, downloadable PDF |
| Send Payment Reminders | WhatsApp integration; template-based |
| Track Deliveries | Map view; driver status |

### Mobile UX Principles
- Bottom navigation bar (not hamburger menu)
- Gesture-friendly swipe actions (e.g., swipe right on order to accept)
- Large input fields and tap targets (min 44×44pt)
- Offline mode: orders visible and actions queued for when connectivity returns
- Fast load: critical screens (orders, inventory) under 2 seconds on 4G

---

## 32. Future Roadmap (Phase 2 & 3)

### Phase 2 Features

| Feature | Description |
|---|---|
| AI Demand Forecasting | Predict how much stock will be needed based on order history |
| Smart Reorder Suggestions | Auto-suggest purchase orders to vendor |
| Auto Substitute Recommendations | When OOS, AI suggests best substitutes |
| Smart Pricing Recommendations | Suggest price adjustments based on competition/demand |
| Route Optimization | Optimal delivery route for multi-drop days |
| Salesman App | Dedicated app for field sales staff |
| Voice Ordering | Customer can speak order (vernacular support) |
| WhatsApp Ordering | Full order flow over WhatsApp |
| Smart Collections Engine | AI-prioritized collection call list |

### Phase 3 Features (DiSCCO Integration)

| Feature | Description |
|---|---|
| Full DiSCCO Integration | NBFC-backed credit replaces vendor-backed credit |
| Embedded Lending | Buy Now Pay Later for B2B |
| Dynamic Risk Scoring | Real-time creditworthiness per customer |
| Distributor Financing | Finance distributor's inventory purchases |
| Brand Incentive Automation | Automated scheme payouts to distributors |
| Predictive Inventory | AI-based procurement automation |
| Procurement Automation | Auto-purchase orders based on demand forecasts |

---

## 33. UX Principles

| Principle | Implementation |
|---|---|
| **Vendor-First** | Every screen designed from vendor's operational needs, not Horeca1's analytics needs |
| **Fast Wholesale Operations** | Order acceptance in < 3 taps; inventory update in < 2 taps |
| **Repeat Workflows Take Seconds** | Saved order lists, one-tap reorder, templates for common actions |
| **Reduce WhatsApp/Phone Coordination** | Structured communication replaces informal channels |
| **Formalize Informal Credit** | Credit flows mirror how wholesale credit actually works in India |
| **One Software for Everything** | Vendor should never need to switch to another tool for any core business function |

### UX Anti-Patterns to Avoid
- Do NOT force vendors to complete all fields before saving (allow draft states)
- Do NOT show desktop-style data tables on mobile
- Do NOT require login for every bulk operation
- Do NOT show error messages in technical jargon (use plain language)
- Do NOT auto-block/freeze accounts without warning notifications (warning → freeze → block, never skip states)

---

## 34. Must-Have Feature Checklist

Before any production release, verify ALL items below are implemented and tested:

### Core Operations
- [ ] Bulk Product Upload with validation and error report
- [ ] Bulk Update (pricing, inventory, status, credit eligibility)
- [ ] Partial Fulfillment (item-wise + quantity-wise)
- [ ] Customer-specific pricing

### Credit & Finance
- [ ] Vendor-backed credit with configurable limits and terms
- [ ] Credit freeze / block engine with state transitions
- [ ] Interest & penalty auto-calculation
- [ ] Ledger reconciliation (vendor-customer + vendor-Horeca1)
- [ ] Settlement visibility and payout management

### Operations & Fulfilment
- [ ] Order editing (by vendor post-placement)
- [ ] Multi-warehouse inventory tracking
- [ ] Delivery proof (OTP / photo / signature / geo-tag)
- [ ] Returns & claims flow with ledger adjustment

### Platform
- [ ] Multiple staff roles with granular permissions
- [ ] Brand-distributor mapping and routing logic
- [ ] Customer mapping with territory and salesman assignment
- [ ] Reorder flows and saved order lists
- [ ] Notification center (all channels: App, SMS, WhatsApp, Email)
- [ ] Mobile-first operations on all core screens
- [ ] Analytics (sales, customer, credit, inventory)

---

*End of Horeca1 Vendor Module Technical Specification v1.0*

*This document should be treated as the single source of truth for the Vendor Module. Any new feature, edge case, or clarification should be appended to the relevant section with a version note.*
