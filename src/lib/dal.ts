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

function nextDeliveryLabel(slots: Array<{ dayOfWeek: number; slotStart: string }>): string {
  if (!slots || slots.length === 0) return 'Tomorrow 7:00 AM';
  const now = new Date();
  const todayDay = now.getDay(); // 0=Sun
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let bestDiff = Infinity;
  let bestLabel = '';
  for (const slot of slots) {
    const [h, m] = slot.slotStart.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    let diff = (slot.dayOfWeek - todayDay + 7) % 7;
    if (diff === 0 && slotMinutes <= nowMinutes) diff = 7; // passed today
    if (diff < bestDiff) {
      bestDiff = diff;
      const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][slot.dayOfWeek];
      bestLabel = `${label} ${slot.slotStart}`;
    }
  }
  return bestLabel || 'Tomorrow 7:00 AM';
}

function toVendor(v: Record<string, unknown>): Vendor {
  const slots = Array.isArray(v.deliverySlots) ? (v.deliverySlots as Array<{ dayOfWeek: number; slotStart: string }>) : [];
  return {
    id: v.id as string,
    name: (v.businessName as string) || '',
    slug: (v.slug as string) || '',
    logo: (v.logoUrl as string) || '/images/top vendors/emarket.png',
    coverImage: (v.bannerUrl as string) || '',
    rating: Number(v.rating) || 0,
    totalRatings: 0,
    deliverySchedule: nextDeliveryLabel(slots),
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

  const basePrice = Number(p.basePrice) || 0;
  const promoPrice = p.promoPrice != null ? Number(p.promoPrice) : null;
  const mrp = p.originalPrice != null ? Number(p.originalPrice) : null;
  const effectivePrice = priceSlabs.length > 0
    ? Number(priceSlabs[0].price)
    : (promoPrice != null && promoPrice < basePrice ? promoPrice : basePrice);
  // Strike-through shows the higher reference price (MRP wins if present, else base when promo is active).
  const strikePrice = mrp && mrp > effectivePrice
    ? mrp
    : (promoPrice != null && promoPrice < basePrice ? basePrice : undefined);

  return {
    id: p.id as string,
    name: (p.name as string) || '',
    description: (p.description as string) || '',
    price: effectivePrice,
    originalPrice: strikePrice,
    images: p.imageUrl ? [p.imageUrl as string] : [],
    category: (p.categoryName as string) || (p.category as Record<string, unknown>)?.name as string || '',
    packSize: (p.packSize as string) || '1 unit',
    unit: (p.unit as string) || 'unit',
    stock: inventory ? Number((inventory as Record<string, unknown>).qtyAvailable) || 0 : 0,
    isActive: (p.isActive as boolean) ?? true,
    createdAt: new Date(p.createdAt as string),
    updatedAt: new Date(p.updatedAt as string),
    vendorId: (p.vendorId as string) || (vendor.id as string) || '',
    vendorName: (vendor.businessName as string) || '',
    vendorLogo: (vendor.logoUrl as string) || '',
    categoryId: (p.categoryId as string) || ((p.category as Record<string, unknown>)?.id as string) || undefined,
    bulkPrices: priceSlabs.map((s): BulkPriceTier => ({
      minQty: Number(s.minQty),
      price: Number(s.price),
    })),
    creditBadge: (p.creditEligible as boolean) || false,
    minOrderQuantity: priceSlabs.length > 0 ? Number(priceSlabs[0].minQty) : 1,
    frequentlyOrdered: false,
    isDeal: strikePrice !== undefined && strikePrice > effectivePrice,
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
    async getProducts(vendorId: string, options?: { categoryId?: string; search?: string; cursor?: string; limit?: number }) {
      const params = new URLSearchParams();
      if (options?.categoryId) params.set('categoryId', options.categoryId);
      if (options?.search) params.set('search', options.search);
      if (options?.cursor) params.set('cursor', options.cursor);
      if (options?.limit) params.set('limit', String(options.limit));
      const qs = params.toString() ? `?${params}` : '';

      const data = await apiFetch<{ products: Record<string, unknown>[]; pagination: unknown }>(`/api/v1/vendors/${vendorId}/products${qs}`);
      return {
        products: data.products.map((p) => toVendorProduct(p)),
        pagination: data.pagination,
      };
    },

    /** Check if a pincode is serviceable. Returns serviceability flag, vendor count, and the list of vendorIds that service the pincode. */
    async checkServiceability(pincode: string) {
      return apiFetch<{ serviceable: boolean; vendor_count: number; vendorIds: string[] }>(`/api/v1/vendors/serviceability?pincode=${pincode}`);
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

  products: {
    /** Featured deals — products with a real discount (promo < base, or base < MRP). */
    async deals(options?: { pincode?: string; limit?: number }) {
      const params = new URLSearchParams();
      if (options?.pincode) params.set('pincode', options.pincode);
      if (options?.limit) params.set('limit', String(options.limit));
      const qs = params.toString() ? `?${params}` : '';
      const data = await apiFetch<{ products: Record<string, unknown>[] }>(`/api/v1/products/deals${qs}`);
      return {
        products: data.products.map((p) => toVendorProduct(p)),
      };
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

  reviews: {
    /** Submit a review for a delivered order */
    async submit(orderId: string, rating: number, comment?: string) {
      return apiFetch(`/api/v1/orders/${orderId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
    },

    /** Get existing review for an order */
    async getOrderReview(orderId: string) {
      return apiFetch<{ rating: number; comment?: string; createdAt: string } | null>(`/api/v1/orders/${orderId}/review`);
    },

    /** Get paginated reviews + rating distribution for a vendor */
    async getVendorReviews(vendorId: string, cursor?: string) {
      const qs = cursor ? `?cursor=${cursor}` : '';
      return apiFetch<{
        reviews: Array<{ id: string; rating: number; comment?: string; createdAt: string; reviewerName: string }>;
        distribution: Record<string, number>;
        totalCount: number;
        pagination: { hasMore: boolean; nextCursor: string | null };
      }>(`/api/v1/vendors/${vendorId}/reviews${qs}`);
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

  // ── BRANDS ────────────────────────────────────────────────
  brands: {
    /** List approved brands (homepage / discovery) */
    async list(options?: { limit?: number; cursor?: string }) {
      const qs = new URLSearchParams();
      if (options?.limit) qs.set('limit', String(options.limit));
      if (options?.cursor) qs.set('cursor', options.cursor);
      const q = qs.toString();
      return apiFetch<{
        brands: Array<{
          id: string; name: string; slug: string;
          logo: string | null; banner: string | null;
          tagline: string | null; productCount: number;
        }>;
        hasMore: boolean; nextCursor: string | null;
      }>(`/api/v1/brands${q ? '?' + q : ''}`);
    },

    /** Get brand store page data (products + distributor availability) */
    async getBySlug(slug: string) {
      return apiFetch<{
        id: string; name: string; slug: string;
        logo: string | null; banner: string | null;
        tagline: string | null; description: string | null;
        products: Array<{
          id: string; name: string; description: string | null;
          image: string | null; packSize: string | null; category: string;
          distributors: Array<{
            vendorId: string; price: number; inStock: boolean;
            distributorProductId: string;
          }>;
        }>;
        vendors: Array<{
          id: string; name: string; slug: string; logo: string | null;
          pincodes: string[]; productIds: string[];
          prices: Record<string, number>;
        }>;
      }>(`/api/v1/brands/${slug}`);
    },
  },
};
