// MSG91 Flow template IDs — override via env in production.
//
// IMPORTANT: these MUST be the **MSG91 template IDs** (24-char hex, shown in the
// MSG91 dashboard → SMS → Templates), NOT the 19-digit DLT content-template IDs
// from the DLT portal. Passing a DLT ID makes the Flow API reject the send with
// "Template ID Missing or Invalid Template" (error 211) — the send shows up under
// API Failed Logs and never reaches the operator.
//
// Variable names passed in code must match the template placeholders exactly:
//   orderConfirmVendor   → ##number##    ("Vendor Order Receipt to Vendor")
//   orderConfirmCustomer → ##var1##/##var2## ("Customer Order Confirmation")  [VERIFY vars]
//   orderCancelCustomer  → ##var1##      ("Order Cancellation to Customer")
//   generalPurpose       → ##content##   ("General All Purpose")
// NOTE: these templates are DLT time-gated (~9am–9pm IST) unless re-registered
// under a non-time-restricted category. Login OTP uses MSG91_OTP_TEMPLATE_ID
// (separate OTP API, not Flow).
export const SMS_TEMPLATES = {
  orderConfirmCustomer: process.env.MSG91_SMS_ORDER_CONFIRM_CUSTOMER_TEMPLATE_ID ?? '67163e54d6fc0538fe0edca4',
  orderConfirmVendor: process.env.MSG91_SMS_ORDER_CONFIRM_VENDOR_TEMPLATE_ID ?? '67163ee4d6fc0504f7711282',
  orderCancelCustomer: process.env.MSG91_SMS_ORDER_CANCEL_TEMPLATE_ID ?? '671644c1d6fc0562a36369a2',
  generalPurpose: process.env.MSG91_SMS_GENERAL_TEMPLATE_ID ?? '671108dcd6fc054e50057712',
} as const;
