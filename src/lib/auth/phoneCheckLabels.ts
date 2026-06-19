import type { PhoneCheckResult } from '@/lib/auth/checkPhoneLookup';

export function accountLabelFromCheck(
  data: Pick<PhoneCheckResult, 'accountType' | 'userRole' | 'vendorStatus'>,
): string {
  if (data.accountType === 'vendor') return 'Vendor';
  if (data.accountType === 'vendor_pending') return 'Vendor (pending review)';
  if (data.userRole === 'brand') return 'Brand';
  if (data.userRole === 'admin') return 'Admin';
  return 'Customer';
}
