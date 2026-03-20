// ============================================================
// DAL (Data Access Layer) — Bridge between API and Frontend
// ============================================================
// WHY: Our API returns database shapes (businessName, logoUrl, Decimal strings)
// but our frontend components expect different shapes (name, logo, numbers).
// This file fetches from the API and transforms the data to match frontend types.
//
// HOW TO USE:
//   Server components: const vendors = await dal.vendors.list();
//   Client components: useEffect(() => { dal.vendors.list().then(setVendors) }, []);
// ============================================================

import type { Vendor, VendorProduct, BulkPriceTier, Category, VendorSummary } from '@/types';

// Base URL for API calls — works both server-side and client-side
function getBaseUrl() {
  if (typeof window !== 'undefined') return ''; // client-side: relative URL
  return process.env.AUTH_URL || 'http://localhost:3000'; // server-side: absolute URL
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(error.error?.message || `API Error: ${res.status}`);
  }

  const json = await res.json();
  return json.data ?? json;
}

// ---- TRANSFORMERS ----
// These convert API response shapes → frontend type shapes

function toVendor(v: Record<string, unknown>): Vendor {
  return {
    id: v.id as string,
    name: (v.businessName as string) || '',
    slug: (v.slug as string) || '',
    logo: (v.logoUrl as string) || '/images/top vendors/emarket.png',
    rating: Number(v.rating) || 0,
    totalRatings: 0,
    deliverySchedule: 'Tomorrow 7:00 AM',
    deliveryTime: '24 hrs',
    minOrderValue: Number(v.minOrderValue) || 0,
    creditEnabled: (v.creditEnabled as boolean) || false,
    categories: Array.isArray(v.categories) ? (v.categories as string[]) : [],
    isActive: true,
    description: (v.description as string) || '',
  };
}

function toVendorSummary(v: Record<string, unknown>): VendorSummary {
  return {
    id: v.id as string,
    name: (v.businessName as string) || '',
    slug: (v.slug as string) || '',
    logo: (v.logoUrl as string) || '/images/top vendors/emarket.png',
    rating: Number(v.rating) || 0,
    deliveryTime: '24 hrs',
    minOrderValue: Number(v.minOrderValue) || 0,
    creditEnabled: (v.creditEnabled as boolean) || false,
    categories: Array.isArray(v.categories) ? (v.categories as string[]) : [],
  };
}

function toVendorProduct(p: Record<string, unknown>, vendorInfo?: Record<string, unknown>): VendorProduct {
  const priceSlabs = (p.priceSlabs as Array<Record<string, unknown>>) || [];
  const inventory = p.inventory as Record<string, unknown> | null;
  const vendor = (p.vendor as Record<string, unknown>) || vendorInfo || {};

  return {
    id: p.id as string,
    name: (p.name as string) || '',
    description: (p.description as string) || '',
    price: priceSlabs.length > 0 ? Number(priceSlabs[0].price) : Number(p.basePrice) || 0,
    originalPrice: Number(p.basePrice) || 0,
    images: p.imageUrl ? [p.imageUrl as string] : [],
    category: '',
    packSize: (p.packSize as string) || '1 unit',
    unit: (p.unit as string) || 'unit',
    stock: inventory ? Number((inventory as Record<string, unknown>).qtyAvailable) || 0 : 0,
    isActive: (p.isActive as boolean) ?? true,
    createdAt: new Date(p.createdAt as string),
    updatedAt: new Date(p.updatedAt as string),
    vendorId: (p.vendorId as string) || (vendor.id as string) || '',
    vendorName: (vendor.businessName as string) || '',
    vendorLogo: (vendor.logoUrl as string) || '',
    bulkPrices: priceSlabs.map((s): BulkPriceTier => ({
      minQty: Number(s.minQty),
      price: Number(s.price),
    })),
    creditBadge: (p.creditEligible as boolean) || false,
    minOrderQuantity: priceSlabs.length > 0 ? Number(priceSlabs[0].minQty) : 1,
    frequentlyOrdered: false,
    isDeal: false,
  };
}

function toCategory(c: Record<string, unknown>): Category {
  return {
    id: c.id as string,
    name: (c.name as string) || '',
    slug: (c.slug as string) || '',
    image: (c.imageUrl as string) || '/images/category/vegitable.png',
    parentId: (c.parentId as string) || undefined,
    isActive: (c.isActive as boolean) ?? true,
  };
}

// ---- API FUNCTIONS ----

export const dal = {
  vendors: {
    /** List all active vendors */
    async list(options?: { pincode?: string; categoryId?: string; cursor?: string }) {
      const params = new URLSearchParams();
      if (options?.pincode) params.set('pincode', options.pincode);
      if (options?.categoryId) params.set('categoryId', options.categoryId);
      if (options?.cursor) params.set('cursor', options.cursor);
      const qs = params.toString() ? `?${params}` : '';

      const data = await apiFetch<{ vendors: Record<string, unknown>[]; pagination: { next_cursor: string | null; has_more: boolean } }>(`/api/v1/vendors${qs}`);
      return {
        vendors: data.vendors.map(toVendor),
        pagination: data.pagination,
      };
    },

    /** Get single vendor by ID */
    async getById(id: string) {
      const data = await apiFetch<Record<string, unknown>>(`/api/v1/vendors/${id}`);
      return toVendor(data);
    },

    /** Get vendor products with price slabs + inventory */
    async getProducts(vendorId: string, options?: { categoryId?: string; search?: string; cursor?: string }) {
      const params = new URLSearchParams();
      if (options?.categoryId) params.set('categoryId', options.categoryId);
      if (options?.search) params.set('search', options.search);
      if (options?.cursor) params.set('cursor', options.cursor);
      const qs = params.toString() ? `?${params}` : '';

      const data = await apiFetch<{ products: Record<string, unknown>[]; pagination: unknown }>(`/api/v1/vendors/${vendorId}/products${qs}`);
      return {
        products: data.products.map((p) => toVendorProduct(p)),
        pagination: data.pagination,
      };
    },

    /** Check if a pincode is serviceable */
    async checkServiceability(pincode: string) {
      return apiFetch<{ serviceable: boolean; vendor_count: number }>(`/api/v1/vendors/serviceability?pincode=${pincode}`);
    },
  },

  categories: {
    /** List all categories */
    async list() {
      const data = await apiFetch<Record<string, unknown>[]>('/api/v1/categories');
      return data.map(toCategory);
    },

    /** Get vendors for a category */
    async getVendors(categoryId: string, pincode?: string) {
      const qs = pincode ? `?pincode=${pincode}` : '';
      const data = await apiFetch<Record<string, unknown>[]>(`/api/v1/categories/${categoryId}/vendors${qs}`);
      return data.map(toVendorSummary);
    },
  },

  search: {
    /** Search products, vendors, categories */
    async query(q: string, options?: { pincode?: string; cursor?: string }) {
      const params = new URLSearchParams({ q });
      if (options?.pincode) params.set('pincode', options.pincode);
      if (options?.cursor) params.set('cursor', options.cursor);

      const data = await apiFetch<{
        products: Record<string, unknown>[];
        vendors: Record<string, unknown>[];
        categories: Record<string, unknown>[];
        pagination: unknown;
      }>(`/api/v1/search?${params}`);

      return {
        products: data.products.map((p) => toVendorProduct(p)),
        vendors: data.vendors.map(toVendorSummary),
        categories: data.categories.map(toCategory),
        pagination: data.pagination,
      };
    },
  },

  collections: {
    /** List all collections */
    async list() {
      return apiFetch<Array<{ id: string; name: string; slug: string; description: string; products: Record<string, unknown>[] }>>('/api/v1/collections');
    },
  },

  cart: {
    /** Get current user's cart (vendor-grouped) */
    async get() {
      return apiFetch<{ vendorGroups: unknown[]; total: number }>('/api/v1/cart');
    },

    /** Add item to cart */
    async addItem(productId: string, vendorId: string, quantity: number) {
      return apiFetch('/api/v1/cart', {
        method: 'POST',
        body: JSON.stringify({ productId, vendorId, quantity }),
      });
    },

    /** Update item quantity */
    async updateItem(itemId: string, quantity: number) {
      return apiFetch(`/api/v1/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
    },

    /** Remove item from cart */
    async removeItem(itemId: string) {
      return apiFetch(`/api/v1/cart/items/${itemId}`, { method: 'DELETE' });
    },

    /** Clear entire cart */
    async clear() {
      return apiFetch('/api/v1/cart', { method: 'DELETE' });
    },
  },

  orders: {
    /** Create new order(s) from cart */
    async create(vendorOrders: Array<{ vendorId: string; items: Array<{ productId: string; quantity: number }>; deliverySlotId?: string; notes?: string }>, paymentMethod: string) {
      return apiFetch('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({ vendorOrders, paymentMethod }),
      });
    },

    /** List user's orders */
    async list(options?: { status?: string; vendorId?: string; cursor?: string }) {
      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.vendorId) params.set('vendorId', options.vendorId);
      if (options?.cursor) params.set('cursor', options.cursor);
      const qs = params.toString() ? `?${params}` : '';

      return apiFetch<{ orders: unknown[]; pagination: unknown }>(`/api/v1/orders${qs}`);
    },

    /** Get single order */
    async getById(id: string) {
      return apiFetch(`/api/v1/orders/${id}`);
    },
  },

  lists: {
    /** Get all quick order lists */
    async getAll() {
      return apiFetch<unknown[]>('/api/v1/lists');
    },

    /** Get single list with items */
    async getById(id: string) {
      return apiFetch(`/api/v1/lists/${id}`);
    },

    /** Create new list */
    async create(name: string, vendorId: string, items?: Array<{ productId: string; defaultQty: number }>) {
      return apiFetch('/api/v1/lists', {
        method: 'POST',
        body: JSON.stringify({ name, vendorId, items }),
      });
    },

    /** Delete a list */
    async delete(id: string) {
      return apiFetch(`/api/v1/lists/${id}`, { method: 'DELETE' });
    },
  },

  notifications: {
    /** List notifications */
    async list(options?: { cursor?: string }) {
      const qs = options?.cursor ? `?cursor=${options.cursor}` : '';
      return apiFetch<{ notifications: unknown[]; pagination: unknown }>(`/api/v1/notifications${qs}`);
    },

    /** Mark one as read */
    async markRead(id: string) {
      return apiFetch('/api/v1/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ notificationId: id }),
      });
    },

    /** Mark all as read */
    async markAllRead() {
      return apiFetch('/api/v1/notifications/read-all', { method: 'POST' });
    },
  },
};
