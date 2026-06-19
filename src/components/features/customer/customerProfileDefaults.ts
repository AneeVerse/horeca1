import type { CustomerProfileValues } from './CustomerProfileForm';

export const EMPTY_CUSTOMER_PROFILE: CustomerProfileValues = {
  customerType: 'business',
  customerLanguage: 'en',
  taxPreference: 'taxable',
  currency: 'INR',
  paymentTerms: 'due_on_receipt',
  enablePortal: false,
};
