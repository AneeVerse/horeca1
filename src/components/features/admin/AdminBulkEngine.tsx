'use client';

/**
 * AdminBulkEngine — admin-portal wrapper around the shared BulkEngineDrawer.
 * Cross-vendor: the rule builder gets a vendor filter, stock goes through the
 * admin bulk endpoint, and the products bulk-update accepts a vendorId scope.
 *
 * Customer pricing & combos are vendor-owned (price lists / combos belong to a
 * vendor), so they're disabled here — admin operates across vendors and there
 * is no admin endpoint for those yet.
 */

import React, { useMemo } from 'react';
import BulkEngineDrawer, { type BulkEngineConfig, type BulkProduct } from '@/components/features/shared/BulkEngineDrawer';

interface AdminProductInput {
  id: string;
  name: string;
  basePrice: number;
  isActive: boolean;
  brand?: string | null;
  tags?: string[] | null;
  imageUrl?: string | null;
  category?: { id: string } | null;
  vendor?: { id: string } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  products: AdminProductInput[];
  selectedIds: string[];
  categories: { id: string; name: string; parentId?: string | null }[];
  brands: { name: string }[];
  vendors: { id: string; businessName: string }[];
}

export default function AdminBulkEngine({ open, onClose, onComplete, products, selectedIds, categories, brands, vendors }: Props) {
  const config: BulkEngineConfig = useMemo(() => ({
    portal: 'admin',
    endpoints: {
      bulkUpdate: '/api/v1/admin/products/bulk-update',
      stockBulk: '/api/v1/admin/inventory/bulk',
    },
    categories: categories.map((c) => ({ id: c.id, name: c.parentId ? `— ${c.name}` : c.name })),
    brands,
    vendors,
    enableCustomerPricing: false,
    enableCombo: false,
  }), [categories, brands, vendors]);

  const allProducts: BulkProduct[] = useMemo(() => products.map((p) => ({
    id: p.id,
    name: p.name,
    categoryId: p.category?.id ?? null,
    brand: p.brand ?? null,
    isActive: p.isActive,
    basePrice: Number(p.basePrice),
    tags: p.tags ?? null,
    imageUrl: p.imageUrl ?? null,
    vendorId: p.vendor?.id ?? null,
  })), [products]);

  return (
    <BulkEngineDrawer
      open={open}
      onClose={onClose}
      onComplete={onComplete}
      config={config}
      allProducts={allProducts}
      selectedIds={selectedIds}
    />
  );
}
