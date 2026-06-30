import { describe, it, expect } from 'vitest';
import { detectMaterialChanges } from '../product-edit-policy';

describe('detectMaterialChanges', () => {
  const defaultProduct = {
    name: 'Amul Processed Cheese Block ETG 1 Kg',
    brand: 'Amul',
    hsn: '0406',
    packSize: '1 Kg',
    unit: 'Kg',
    vegNonVeg: 'veg' as const,
    masterProductId: '9f639bc8-f708-44af-8a22-6533fac9e4fd',
    categoryId: 'cheese-id-123',
    imageUrl: 'https://example.com/cheese.jpg',
    images: ['https://example.com/cheese.jpg'],
  };

  const defaultCategoryIds = ['cheese-id-123', 'dairy-id-456'];

  it('detects no material changes when category list adds or removes additional categories but primary stays the same', () => {
    // Adding an additional category
    const resultAdd = detectMaterialChanges(
      defaultProduct,
      defaultCategoryIds,
      {},
      ['cheese-id-123', 'dairy-id-456', 'food-id-789']
    );
    expect(resultAdd.hasMaterialChanges).toBe(false);
    expect(resultAdd.materialPayload.categoryIds).toBeUndefined();

    // Removing an additional category
    const resultRemove = detectMaterialChanges(
      defaultProduct,
      defaultCategoryIds,
      {},
      ['cheese-id-123']
    );
    expect(resultRemove.hasMaterialChanges).toBe(false);
    expect(resultRemove.materialPayload.categoryIds).toBeUndefined();
  });

  it('detects material change when the primary category changes', () => {
    const result = detectMaterialChanges(
      defaultProduct,
      defaultCategoryIds,
      {},
      ['milk-id-999', 'dairy-id-456']
    );
    expect(result.hasMaterialChanges).toBe(true);
    expect(result.materialPayload.categoryIds).toEqual(['milk-id-999', 'dairy-id-456']);
  });

  it('detects material change when imageUrl changes', () => {
    const result = detectMaterialChanges(
      defaultProduct,
      defaultCategoryIds,
      { imageUrl: 'https://example.com/cheese-new.jpg' }
    );
    expect(result.hasMaterialChanges).toBe(true);
    expect(result.materialPayload.imageUrl).toBe('https://example.com/cheese-new.jpg');
  });

  it('detects material change when images list changes', () => {
    const result = detectMaterialChanges(
      defaultProduct,
      defaultCategoryIds,
      { images: ['https://example.com/cheese.jpg', 'https://example.com/cheese-extra.jpg'] }
    );
    expect(result.hasMaterialChanges).toBe(true);
    expect(result.materialPayload.images).toEqual([
      'https://example.com/cheese.jpg',
      'https://example.com/cheese-extra.jpg',
    ]);
  });

  it('detects no material change on image fields if they are not provided in incoming payload', () => {
    const result = detectMaterialChanges(
      defaultProduct,
      defaultCategoryIds,
      { description: 'new description' }
    );
    expect(result.hasMaterialChanges).toBe(false);
  });
});
