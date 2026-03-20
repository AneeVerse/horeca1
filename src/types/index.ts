// ============================================================
// Horeca1 — Centralized Type Definitions
// ============================================================

// ---- ADDRESS MODULE (Unified) ----

export type AddressLabel = 'Home' | 'Work' | 'Other';

export interface Address {
    id: string;
    label?: AddressLabel | string;
    fullAddress?: string;
    shortAddress?: string;
    latitude?: number;
    longitude?: number;
    landmark?: string;
    placeId?: string;
    flatInfo?: string; // Flat/Floor/Building
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    postalCode?: string; // For backward compatibility
    country?: string;
    isDefault?: boolean;
    type?: string; // Legacy type mapping
}

// ---- VENDOR MODULE (Unified) ----

export interface Vendor {
    id: string;
    name: string;
    slug: string;
    logo: string;
    coverImage?: string;
    tagline?: string;
    rating: number;
    totalRatings: number;
    deliverySchedule: string; // e.g. "Tomorrow 7AM"
    deliveryTime: string;     // e.g. "24 hrs"
    minOrderValue: number;
    creditEnabled: boolean;
    creditAmount?: number;
    categories: string[];     // categories this vendor sells
    catalog?: VendorCategory[]; // Main catalog structure
    address?: Address;
    isActive: boolean;
    isOpen?: boolean;
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

// ---- CATALOG MODULE (Unified) ----

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    image?: string;         // Catalog image
    images?: string[];      // API images
    category?: string;
    subcategory?: string;
    packSize?: string;      // e.g. "1kg"
    unit?: string;           // e.g. "Kg", "Bottle", "Pack"
    stock?: number;
    inStock: boolean;
    discount?: number;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;

    // Vendor specific (integrated into base for mock data compatibility)
    vendorId?: string;
    vendorName?: string;
    vendorLogo?: string;
    bulkPrices?: BulkPriceTier[];
    creditBadge?: boolean;
    minOrderQuantity?: number;
    frequentlyOrdered?: boolean;
    isDeal?: boolean;
}

export interface VendorProduct extends Product {
    vendorId: string;
    vendorName: string;
    vendorLogo?: string;
    bulkPrices?: BulkPriceTier[];
    creditBadge?: boolean;
    minOrderQuantity?: number;
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

export interface VendorCategory {
    id: string;
    name: string;
    image: string;
    products: Product[];
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
    subtotal: number;
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

// ---- COMPONENT PROPS ----

export interface BaseProps {
    className?: string;
    children?: React.ReactNode;
}

