// All event type definitions for the HoReCa1 event bus
// Each module emits events that other modules can listen to

export interface OrderCreatedPayload {
  orderId: string;
  orderNumber: string;
  userId: string;
  vendorId: string;
  totalAmount: number;
  items: Array<{ productId: string; quantity: number }>;
}

export interface OrderConfirmedPayload {
  orderId: string;
  userId: string;
  vendorId: string;
}

export interface OrderShippedPayload {
  orderId: string;
  userId: string;
  vendorId: string;
}

export interface OrderDeliveredPayload {
  orderId: string;
  userId: string;
  vendorId: string;
}

export interface OrderCancelledPayload {
  orderId: string;
  userId: string;
  vendorId: string;
  reason?: string;
}

export interface PaymentReceivedPayload {
  orderId: string;
  paymentId: string;
  userId: string;
  vendorId: string;
  amount: number;
}

export interface PaymentFailedPayload {
  orderId: string;
  userId: string;
  vendorId: string;
  reason: string;
}

export interface StockUpdatedPayload {
  productId: string;
  vendorId: string;
  qtyAvailable: number;
  lowStockThreshold: number;
}

export interface CreditAppliedPayload {
  creditAccountId: string;
  orderId: string;
  userId: string;
  vendorId: string;
  amount: number;
}

export interface CreditDuePayload {
  creditAccountId: string;
  userId: string;
  vendorId: string;
  amount: number;
  dueDate: string;
}

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  role: string;
}

export interface VendorOnboardedPayload {
  vendorId: string;
  userId: string;
  businessName: string;
}

export interface ListOrderedPayload {
  listId: string;
  userId: string;
  vendorId: string;
  orderId: string;
}

export interface ListCreatedPayload {
  listId: string;
  userId: string;
  vendorId: string;
  name: string;
}

export interface ProductSubmittedPayload {
  productId: string;
  vendorId: string;
  productName: string;
}

export interface ProductApprovedPayload {
  productId: string;
  vendorId: string;
  productName: string;
  approvedBy: string;
}

export interface ProductRejectedPayload {
  productId: string;
  vendorId: string;
  productName: string;
  rejectedBy: string;
  reason?: string;
}

export interface CategorySuggestedPayload {
  categoryId: string;
  categoryName: string;
  suggestedBy: string;
}

export interface CategoryApprovedPayload {
  categoryId: string;
  categoryName: string;
  approvedBy: string;
  suggestedBy?: string;
}

export interface CategoryRejectedPayload {
  categoryId: string;
  categoryName: string;
  rejectedBy: string;
  suggestedBy?: string;
  reason?: string;
}

// Event map: event name → payload type
export interface EventMap {
  OrderCreated: OrderCreatedPayload;
  OrderConfirmed: OrderConfirmedPayload;
  OrderShipped: OrderShippedPayload;
  OrderDelivered: OrderDeliveredPayload;
  OrderCancelled: OrderCancelledPayload;
  PaymentReceived: PaymentReceivedPayload;
  PaymentFailed: PaymentFailedPayload;
  StockUpdated: StockUpdatedPayload;
  CreditApplied: CreditAppliedPayload;
  CreditDue: CreditDuePayload;
  UserRegistered: UserRegisteredPayload;
  VendorOnboarded: VendorOnboardedPayload;
  ListOrdered: ListOrderedPayload;
  ListCreated: ListCreatedPayload;
  ProductSubmitted: ProductSubmittedPayload;
  ProductApproved: ProductApprovedPayload;
  ProductRejected: ProductRejectedPayload;
  CategorySuggested: CategorySuggestedPayload;
  CategoryApproved: CategoryApprovedPayload;
  CategoryRejected: CategoryRejectedPayload;
}

export type EventName = keyof EventMap;
