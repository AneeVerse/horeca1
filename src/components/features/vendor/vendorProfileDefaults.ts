import type { VendorProfileInput } from '@/lib/validators/vendor-profile';

export type VendorProfileValues = VendorProfileInput;

export const EMPTY_VENDOR_PROFILE: VendorProfileValues = {
  categoriesHandled: [],
};
