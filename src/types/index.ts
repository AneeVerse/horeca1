// Common types for the application

// Product types
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    images: string[];
    category: string;
    subcategory?: string;
    stock: number;
    unit: string;
    minOrderQuantity: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Category types
export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    parentId?: string;
    isActive: boolean;
}

// Cart types
export interface CartItem {
    productId: string;
    quantity: number;
    product: Product;
}

export interface Cart {
    items: CartItem[];
    subtotal: number;
    total: number;
}

// User types
export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    businessName?: string;
    businessType?: 'restaurant' | 'cafe' | 'hotel' | 'catering' | 'other';
    address?: Address;
    createdAt: Date;
}

export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

// Order types
export interface Order {
    id: string;
    userId: string;
    items: CartItem[];
    status: OrderStatus;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    shippingAddress: Address;
    billingAddress?: Address;
    paymentMethod: string;
    paymentStatus: PaymentStatus;
    createdAt: Date;
    updatedAt: Date;
}

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export type PaymentStatus =
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded';

// API Response types
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

// Component prop types
export interface BaseProps {
    className?: string;
    children?: React.ReactNode;
}
