import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { emitEvent } from '@/events/emitter';
import { logProductFieldChanges } from '@/lib/product-audit';
import { syncMasterProductCategories, syncProductCategories } from '@/modules/catalog/catalog.service';

const REVISION_TTL_DAYS = 7;

export interface MasterProductSyncFields {
  name?: string;
  brand?: string | null;
  categoryId?: string;
  categoryIds?: string[];
  taxPercent?: number | Prisma.Decimal;
  imageUrl?: string | null;
  images?: string[];
}

/** Count vendor listings linked to a master product. */
export async function countLinkedVendorProducts(masterProductId: string): Promise<number> {
  return prisma.product.count({
    where: {
      masterProductId,
      slug: { not: { startsWith: '_deleted_' } },
    },
  });
}

/** Save a revision snapshot before admin edits (7-day rollback window). */
export async function saveMasterProductRevision(
  masterProductId: string,
  createdBy: string,
): Promise<void> {
  const master = await prisma.masterProduct.findUnique({
    where: { id: masterProductId },
    include: { categoryLinks: { select: { categoryId: true } } },
  });
  if (!master) return;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REVISION_TTL_DAYS);

  await prisma.masterProductRevision.create({
    data: {
      masterProductId,
      createdBy,
      expiresAt,
      categoryIds: master.categoryLinks.map((l) => l.categoryId),
      snapshot: {
        sku: master.sku,
        name: master.name,
        brand: master.brand,
        categoryId: master.categoryId,
        taxPercent: Number(master.taxPercent),
        imageUrl: master.imageUrl,
        images: master.images,
        aliasNames: master.aliasNames,
        uom: master.uom,
        isActive: master.isActive,
      },
    },
  });

  // Prune expired revisions
  await prisma.masterProductRevision.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

/** Revert master + cascade to linked vendor listings from a revision. */
export async function revertMasterProductRevision(
  revisionId: string,
  adminUserId: string,
): Promise<void> {
  const revision = await prisma.masterProductRevision.findUnique({
    where: { id: revisionId },
    include: { masterProduct: { select: { id: true } } },
  });
  if (!revision) throw new Error('Revision not found');
  if (revision.expiresAt < new Date()) throw new Error('Revision expired');

  const snap = revision.snapshot as Record<string, unknown>;
  const categoryIds =
    revision.categoryIds.length > 0
      ? revision.categoryIds
      : typeof snap.categoryId === 'string'
        ? [snap.categoryId]
        : [];

  await prisma.masterProduct.update({
    where: { id: revision.masterProductId },
    data: {
      name: String(snap.name ?? ''),
      brand: snap.brand != null ? String(snap.brand) : null,
      categoryId: categoryIds[0],
      taxPercent: Number(snap.taxPercent ?? 0),
      imageUrl: snap.imageUrl != null ? String(snap.imageUrl) : null,
      images: Array.isArray(snap.images) ? (snap.images as string[]) : [],
      aliasNames: Array.isArray(snap.aliasNames) ? (snap.aliasNames as string[]) : [],
      uom: snap.uom != null ? String(snap.uom) : null,
      isActive: Boolean(snap.isActive ?? true),
    },
  });

  if (categoryIds.length > 0) {
    await syncMasterProductCategories(revision.masterProductId, categoryIds);
  }

  await syncMasterFieldsToVendorListings(revision.masterProductId, adminUserId, {
    name: String(snap.name ?? ''),
    brand: snap.brand != null ? String(snap.brand) : null,
    categoryId: categoryIds[0],
    categoryIds,
    taxPercent: Number(snap.taxPercent ?? 0),
    imageUrl: snap.imageUrl != null ? String(snap.imageUrl) : null,
    images: Array.isArray(snap.images) ? (snap.images as string[]) : [],
  });
}

/**
 * Auto-sync locked fields from master catalog to all linked vendor listings.
 * Vendor-owned fields (price, inventory, description, POS SKU) are never touched.
 */
export async function syncMasterFieldsToVendorListings(
  masterProductId: string,
  changedBy: string,
  fields: MasterProductSyncFields,
): Promise<number> {
  const listings = await prisma.product.findMany({
    where: {
      masterProductId,
      slug: { not: { startsWith: '_deleted_' } },
    },
    select: {
      id: true,
      vendorId: true,
      name: true,
      brand: true,
      categoryId: true,
      taxPercent: true,
      imageUrl: true,
      images: true,
    },
  });

  if (listings.length === 0) return 0;

  for (const listing of listings) {
    const updateData: Prisma.ProductUpdateInput = {};
    const auditChanges: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

    if (fields.name !== undefined && fields.name !== listing.name) {
      updateData.name = fields.name;
      auditChanges.push({ field: 'name', oldValue: listing.name, newValue: fields.name });
    }
    if (fields.brand !== undefined && fields.brand !== listing.brand) {
      updateData.brand = fields.brand;
      auditChanges.push({ field: 'brand', oldValue: listing.brand, newValue: fields.brand });
    }
    if (fields.taxPercent !== undefined && Number(fields.taxPercent) !== Number(listing.taxPercent)) {
      updateData.taxPercent = fields.taxPercent;
      auditChanges.push({
        field: 'taxPercent',
        oldValue: listing.taxPercent,
        newValue: fields.taxPercent,
      });
    }

    const categoryIds = fields.categoryIds ?? (fields.categoryId ? [fields.categoryId] : undefined);
    if (categoryIds && categoryIds.length > 0 && categoryIds[0] !== listing.categoryId) {
      updateData.category = { connect: { id: categoryIds[0] } };
      auditChanges.push({
        field: 'categoryId',
        oldValue: listing.categoryId,
        newValue: categoryIds[0],
      });
    }

    // Images: sync only when vendor has no custom upload
    if (fields.imageUrl !== undefined && !listing.imageUrl) {
      updateData.imageUrl = fields.imageUrl;
      auditChanges.push({ field: 'imageUrl', oldValue: listing.imageUrl, newValue: fields.imageUrl });
    }
    if (fields.images !== undefined && (!listing.images || listing.images.length === 0)) {
      updateData.images = fields.images;
      auditChanges.push({ field: 'images', oldValue: listing.images, newValue: fields.images });
    }

    if (Object.keys(updateData).length === 0 && !categoryIds?.length) continue;

    await prisma.product.update({ where: { id: listing.id }, data: updateData });

    if (categoryIds?.length) {
      await syncProductCategories(listing.id, categoryIds);
    }

    if (auditChanges.length > 0) {
      await logProductFieldChanges(listing.id, changedBy, 'master_sync', auditChanges);
    }

    if (listing.vendorId) {
      emitEvent('MasterProductSyncedToVendor', {
        masterProductId,
        productId: listing.id,
        vendorId: listing.vendorId,
        productName: (fields.name as string) ?? listing.name,
      });
    }
  }

  return listings.length;
}
