# Deferred Modules — Implementation Plans

Scoping for the client-requested modules not yet built. Each is a multi-day
feature; this captures the concrete approach so they can be picked up cleanly.

## 1. WhatsApp notification channel
**State:** stubbed. `NotificationChannel.whatsapp` enum exists; the worker and
`sendDueReminders()` already enqueue `whatsapp` jobs, and credit reminders fan
out to it — but there's no real sender.
**Plan:**
- Add `src/lib/providers/whatsapp.ts` mirroring `providers/sms.ts` (env-gated,
  console-log fallback). Use the **WhatsApp Cloud API** (Meta) or an aggregator
  (Gupshup/MSG91 WhatsApp) — pick one, key via `WHATSAPP_*` env vars, keep it
  behind the same provider-interface pattern as SMS/email (see
  [[feedback_provider_agnostic_ai]]).
- Wire it into `notification.worker.ts` where channel === 'whatsapp'.
- Pre-register message templates (OTP, order confirmation, dispatch, payment
  reminder) — Cloud API requires approved templates for business-initiated msgs.
- The customer/vendor "WhatsApp button" in the brief is **Horeca1-internal only**
  (admin-side messaging) — keep it out of customer/vendor storefront views.

## 2. GRN (Goods Receipt) + Dispatch + Picking/Packing
**State:** not built. Orders have a status flow incl. `ready_for_dispatch`,
`shipped`, `partially_delivered`, `delivered`, and delivery-OTP proof exists.
**Plan:**
- New models: `Picklist` (per order/dispatch), `GoodsReceipt` (vendor inward
  stock against a PO), `Dispatch` (groups order items + courier/route + driver).
- Vendor portal screens: Picking (generate picklist from accepted orders),
  Packing/QC checkbox, Dispatch assignment, GRN entry that increments
  `Inventory.qtyAvailable` and logs to `InventoryLog`.
- Reuse the existing OTP delivery-proof flow for handover.
- Largest piece; sequence after credit/settlement are confirmed stable.

## 3. Brand → Distributor order routing
**State:** mapping data exists (`BrandProductMapping`, `BrandDistributorInvite`)
and brand stores display catalogs, but orders are not auto-routed.
**Plan:**
- On checkout of a brand-store product, resolve the fulfilling distributor via
  `BrandProductMapping` filtered by the customer's pincode/serviceArea, then by
  distributor priority + stock + credit availability (the brief's routing
  factors). Stamp the resolved vendor on the Order.
- Add a `routingReason` audit field so ops can see why a PO went to a vendor.
- Admin override UI to re-route a pending PO (the order-reassign service already
  exists — `OrderService.reassignOrderVendor`; reuse it).

## 4. Vendor outlet-scoped inventory (V2.3 per existing code comments)
**State:** explicitly deferred — the vendor portal shows the active outlet
strip but queries inventory/orders at the vendor (BusinessAccount) level.
**Plan:**
- Add `outletId` to `Inventory` (nullable → per-outlet stock) and to vendor
  order/dispatch queries; default to the vendor's primary outlet for back-compat.
- Gate behind a vendor setting so single-warehouse vendors are unaffected.
- Touches inventory reservation in `inventory.service.ts` + the order
  reserve/release paths — needs careful migration of existing single-pool stock.

## Already shipped this session (for context)
- Auth phone normalization (team-member login fix), payment status-regression
  guard + reconciliation worker, order soft-delete + draft submit, Zoho-style
  My Orders list, unified Excel-like product bulk-upload + master-SKU linking
  fix, full Zoho customer profile (schema + form), Smart Pricelist Workspace.
- Droplet root SSH backdoor removed — see SECURITY_INCIDENT_2026-06-11.md
  (secret rotation + rebuild still owed).
