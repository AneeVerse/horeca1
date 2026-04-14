// ============================================================
// Horeca1 V2.2 — Type Definitions (Modular, Vendor-Centric)
// ============================================================

// ---- VENDOR MODULE ----

export interface Vendor {
    id: string;
    name: string;
    slug: string;
    logo: string;
    coverImage?: string;
    rating: number;
    totalRatings: number;
    deliverySchedule: string; // e.g. "Tomorrow 7AM"
    deliveryTime: string;     // e.g. "24 hrs"
    minOrderValue: number;
    creditEnabled: boolean;
    creditAmount?: number;
    categories: string[];     // categories this vendor sells
    catalog?: any[];          // Full category & product structure
    address?: Address;
    isActive: boolean;
    description?: string;
}

export interface VendorSummary {
    id: string;
    name: string;
    slug: string;
    logo: string;
    rating: number;
    deliveryTime: string;
    minOrderValue: number;
    creditEnabled: boolean;
    categories: string[];
}

// ---- CATALOG MODULE ----

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    images: string[];
    category: string;
    subcategory?: string;
    packSize: string;       // e.g. "1kg", "500ml", "12pcs"
    unit: string;
    stock: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface VendorProduct extends Product {
    vendorId: string;
    vendorName: string;
    vendorLogo?: string;
    categoryId?: string;         // DB category UUID — used for reliable category-page filtering
    bulkPrices: BulkPriceTier[];
    creditBadge: boolean;
    minOrderQuantity: number;    // min qty the customer must add (from DB minOrderQty)
    taxPercent?: number;         // GST rate e.g. 18; 0 = no GST
    taxableRate?: number;        // price ex-GST — for accurate cart math (price / (1 + tax%))
    vendorMinOrderValue?: number; // vendor's min ₹ order value for this vendor group
    frequentlyOrdered?: boolean;
    isDeal?: boolean;
}

export interface BulkPriceTier {
    minQty: number;
    price: number;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    icon?: string;
    parentId?: string;
    itemCount?: number;
    isActive: boolean;
}

// ---- CART MODULE (Vendor-Grouped) ----

export interface CartItem {
    productId: string;
    product: VendorProduct;
    quantity: number;
}

export interface VendorCartGroup {
    vendorId: string;
    vendorName: string;
    vendorLogo?: string;
    items: CartItem[];
    subtotal: number;        // gross subtotal (GST-inclusive)
    subtotalTaxable: number; // taxable value (ex-GST) — for GST breakdown display
    totalGST: number;        // GST portion = subtotal - subtotalTaxable
    minOrderValue: number;
    meetsMinOrder: boolean;
}

export interface Cart {
    groups: VendorCartGroup[];
    totalItems: number;
    totalAmount: number;
    vendorCount: number;
}

// ---- ORDER LISTS MODULE ----

export interface OrderList {
    id: string;
    name: string;
    userId: string;
    vendorId: string;
    vendorName: string;
    vendorLogo?: string;
    items: OrderListItem[];
    createdAt: Date;
    updatedAt: Date;
    lastUsed?: Date;
}

export interface OrderListItem {
    productId: string;
    product: VendorProduct;
    defaultQty: number;
    lastOrderedQty?: number;
}

// ---- ORDERS MODULE ----

export interface PurchaseOrder {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorLogo?: string;
    userId: string;
    items: PurchaseOrderItem[];
    subtotal: number;
    tax: number;
    deliveryCharge: number;
    total: number;
    status: POStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    deliverySchedule: string;
    deliverySlot?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PurchaseOrderItem {
    productId: string;
    name: string;
    packSize: string;
    price: number;
    quantity: number;
    total: number;
}

export type POStatus =
    | 'draft'
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';

export type PaymentMethod =
    | 'credit'     // DiSCCO Credit Line
    | 'online'     // PG (UPI, Cards, Netbanking)
    | 'wallet'
    | 'bank_transfer'
    | 'po_number'; // Enterprise PO

export type PaymentStatus =
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded';

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

// ---- USER MODULE ----

export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    businessName?: string;
    businessType?: 'restaurant' | 'cafe' | 'hotel' | 'catering' | 'cloud_kitchen' | 'other';
    address?: Address;
    savedVendors: string[];  // vendor IDs
    creditEnabled: boolean;
    creditLimit?: number;
    creditUsed?: number;
    createdAt: Date;
}

export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    pincode?: string;
}

// ---- SEARCH MODULE ----

export interface SearchResults {
    query: string;
    products: VendorProduct[];
    vendors: VendorSummary[];
    categories: Category[];
}

// ---- API RESPONSE TYPES ----

export interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
}

// ---- BRAND STORE MODULE ----

export interface BrandProduct {
    id: string;
    name: string;
    image: string;
    category: string;
}

export interface BrandVendor {
    id: string;
    name: string;
    logo: string;
    location: string;
    productIds: string[];
    prices: Record<string, string>;
}

export interface BrandStore {
    id: string;
    name: string;
    bannerImage: string;
    logo: string;
    productCount: number;
    products: BrandProduct[];
    vendors: BrandVendor[];
}

// ---- COMPONENT PROPS ----

export interface BaseProps {
    className?: string;
    children?: React.ReactNode;
}
