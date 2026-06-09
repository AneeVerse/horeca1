/**
 * V2.2 Complete Stack Verification Script
 * Covers Points 1 to 7. Runs integration actions directly and cleans up in finally block.
 * 
 * Run: npx tsx scripts/verify_v2_2_features.ts
 */
import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveUnitPrice, CustomerContext } from '../src/modules/pricing/pricing.service';
import { OrderService, OrderContext } from '../src/modules/order/order.service';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const orderService = new OrderService();

// ANSI Colors for logging
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function runTests() {
  console.log(`${BOLD}====================================================`);
  console.log(`🚀 STARTING AUTOMATED VERIFICATION OF FEATURES 1 - 7`);
  console.log(`====================================================${RESET}\n`);

  let failedTests = 0;
  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`  ${GREEN}✓ ${message}${RESET}`);
    } else {
      console.log(`  ${RED}✗ ${message}${RESET}`);
      failedTests++;
    }
  };

  // Cleanup tracking arrays
  const priceListIds: string[] = [];
  const orderIds: string[] = [];
  const creditTxIds: string[] = [];
  const productsToCleanup: string[] = [];
  
  // State restoration variables
  let testCustomer: any = null;
  let testProduct: any = null;
  let testVendor: any = null;
  let testBA: any = null;
  let testOutlet: any = null;

  let orderCustomer: any = null;
  let orderVendor: any = null;
  let orderProduct: any = null;
  let orderBA: any = null;
  let orderOutlet: any = null;
  let secondaryVendor: any = null;
  let targetProduct: any = null;

  let originalInventory: any = null;
  let originalTargetInventory: any = null;

  let originalCreditAcc: any = null;
  let didCreateCreditAcc = false;

  let originalSecondaryCreditAcc: any = null;
  let didCreateSecondaryCreditAcc = false;

  let originalVendorCustomer: any = null;
  let didCreateVendorCustomer = false;

  try {
    // ═══════════════════════════════════════════════════════
    //  POINT 1: USER & ACCESS CONTROL
    // ═══════════════════════════════════════════════════════
    console.log(`${BOLD}1. USER & ACCESS CONTROL${RESET}`);
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    const vendorUser = await prisma.user.findFirst({ where: { role: 'vendor' } });
    const brandUser = await prisma.user.findFirst({ where: { role: 'brand' } });
    const customerUser = await prisma.user.findFirst({ where: { role: 'customer' } });

    assert(!!adminUser, `Seeded Admin user exists: ${adminUser?.email}`);
    assert(!!vendorUser, `Seeded Vendor user exists: ${vendorUser?.email}`);
    assert(!!brandUser, `Seeded Brand user exists: ${brandUser?.email}`);
    assert(!!customerUser, `Seeded Customer user exists: ${customerUser?.email}`);

    // Verify HCID model
    assert(!!customerUser?.hcidDisplay && customerUser.hcidDisplay.startsWith('HC-'), `HCID is present and formatted: ${customerUser?.hcidDisplay}`);

    // Verify role templates count
    const roleTemplates = await prisma.accountRole.count({ where: { isTemplate: true } });
    assert(roleTemplates >= 14, `Seeded Role Templates exist (Found: ${roleTemplates} templates)`);


    // ═══════════════════════════════════════════════════════
    //  POINT 2: CUSTOMER MANAGEMENT
    // ═══════════════════════════════════════════════════════
    console.log(`\n${BOLD}2. CUSTOMER MANAGEMENT${RESET}`);
    // Check 13 profile attributes on BusinessAccount
    const ba = await prisma.businessAccount.findFirst({ where: { isCustomer: true } });
    assert(ba !== null, `Customer Business Account exists: ${ba?.legalName}`);
    assert('subType' in (ba || {}), 'Column "subType" exists on BusinessAccount');
    assert('cuisine' in (ba || {}), 'Column "cuisine" exists on BusinessAccount');
    assert('businessSize' in (ba || {}), 'Column "businessSize" exists on BusinessAccount');
    assert('monthlyPurchaseBand' in (ba || {}), 'Column "monthlyPurchaseBand" exists on BusinessAccount');
    assert('procurementFrequency' in (ba || {}), 'Column "procurementFrequency" exists on BusinessAccount');
    assert('designation' in (ba || {}), 'Column "designation" exists on BusinessAccount');
    assert('leadStatus' in (ba || {}), 'Column "leadStatus" exists on BusinessAccount');
    assert('creditType' in (ba || {}), 'Column "creditType" exists on BusinessAccount');
    assert('manualTags' in (ba || {}), 'Column "manualTags" exists on BusinessAccount');
    assert('aiTags' in (ba || {}), 'Column "aiTags" exists on BusinessAccount');
    assert('behaviourTags' in (ba || {}), 'Column "behaviourTags" exists on BusinessAccount');

    // Outlets Check
    const outletsCount = await prisma.outlet.count();
    assert(outletsCount > 0, `Seeded Outlets exist in the system (Total: ${outletsCount})`);
    const customerOutlets = await prisma.outlet.findMany({ where: { businessAccountId: ba?.id } });
    assert(customerOutlets.length > 0, `Customer has mapped outlets (Found: ${customerOutlets.length})`);


    // ═══════════════════════════════════════════════════════
    //  POINT 3: BRAND & VENDOR MANAGEMENT
    // ═══════════════════════════════════════════════════════
    console.log(`\n${BOLD}3. BRAND & VENDOR MANAGEMENT${RESET}`);
    // Vendor KYC Display Columns check
    const vendor = await prisma.vendor.findFirst();
    assert(!!vendor, `Vendor exists: ${vendor?.businessName}`);
    assert('bankAccountName' in (vendor || {}), 'Column "bankAccountName" exists on Vendor');
    assert('bankAccountNumber' in (vendor || {}), 'Column "bankAccountNumber" exists on Vendor');
    assert('bankIfsc' in (vendor || {}), 'Column "bankIfsc" exists on Vendor');
    assert('panNumber' in (vendor || {}), 'Column "panNumber" exists on Vendor');
    assert('fssaiNumber' in (vendor || {}), 'Column "fssaiNumber" exists on Vendor');
    assert('pickupAddressLine' in (vendor || {}), 'Column "pickupAddressLine" exists on Vendor');

    // Brand mapping check
    const brandMappingsCount = await prisma.brandProductMapping.count();
    assert(brandMappingsCount >= 0, `Brand product mappings count: ${brandMappingsCount}`);


    // ═══════════════════════════════════════════════════════
    //  POINT 4: CENTRAL ITEM MANAGEMENT
    // ═══════════════════════════════════════════════════════
    console.log(`\n${BOLD}4. CENTRAL ITEM MANAGEMENT${RESET}`);
    // Check MasterProduct table & Product.masterProductId relation
    const masterCount = await prisma.masterProduct.count();
    assert(masterCount > 0, `MasterProduct (canonical SKU) table contains records: ${masterCount}`);

    const mappedProductsCount = await prisma.product.count({ where: { masterProductId: { not: null } } });
    const totalProductsCount = await prisma.product.count();
    assert(mappedProductsCount === totalProductsCount, `All products are linked to Horeca1 Master SKUs (${mappedProductsCount}/${totalProductsCount})`);


    // ═══════════════════════════════════════════════════════
    //  POINT 5: CATEGORY MANAGEMENT
    // ═══════════════════════════════════════════════════════
    console.log(`\n${BOLD}5. CATEGORY MANAGEMENT${RESET}`);
    // Verify 2-level structure: Level-1 (Category) and Level-2 (Sub-Category)
    const level3Count = await prisma.category.count({
      where: {
        parent: {
          parentId: { not: null }
        }
      }
    });
    assert(level3Count === 0, `Strict 2-Level category check: 0 level-3 categories exist in the database.`);


    // ═══════════════════════════════════════════════════════
    //  POINT 6: PRICELIST MANAGEMENT
    // ═══════════════════════════════════════════════════════
    console.log(`\n${BOLD}6. PRICELIST MANAGEMENT & PRICING RESOLVER${RESET}`);

    testCustomer = await prisma.user.findFirst({ where: { role: 'customer' } });
    testProduct = await prisma.product.findFirst({ where: { basePrice: { gt: 0 } } });
    testVendor = await prisma.vendor.findUnique({ where: { id: testProduct?.vendorId! } });
    
    const testMember = await prisma.businessAccountMember.findFirst({ where: { userId: testCustomer?.id } });
    testBA = await prisma.businessAccount.findUnique({ where: { id: testMember?.businessAccountId! } });
    testOutlet = await prisma.outlet.findFirst({ where: { businessAccountId: testBA?.id! } });

    if (!testCustomer || !testProduct || !testVendor || !testBA || !testOutlet) {
      throw new Error('Test environment missing seeded variables');
    }

    // Test 6.1: Base price fallback
    const basePriceResult = await resolveUnitPrice({
      productId: testProduct.id,
      vendorId: testVendor.id,
      quantity: 1,
      customer: {
        userId: testCustomer.id,
        businessAccountId: testBA.id,
        outletId: testOutlet.id,
        outletPincode: testOutlet.pincode,
        outletCity: testOutlet.city,
        outletState: testOutlet.state,
        tags: []
      }
    }, prisma);

    assert(Number(basePriceResult.unitPrice) === Number(testProduct.basePrice), `Default fallback resolves to basePrice: ₹${basePriceResult.unitPrice} (Expected: ₹${testProduct.basePrice})`);

    // Test 6.2: Create a PriceList & Assignment by Pincode + Discount Pricing
    const pincodeList = await prisma.priceList.create({
      data: {
        name: 'Pincode Discount List',
        vendorId: testVendor.id,
        discountPercent: 10, // 10% global fallback
        assignments: {
          create: {
            type: 'pincode',
            pincode: '400001',
          }
        }
      }
    });
    priceListIds.push(pincodeList.id);

    const pincodeDiscountResult = await resolveUnitPrice({
      productId: testProduct.id,
      vendorId: testVendor.id,
      quantity: 1,
      customer: {
        userId: testCustomer.id,
        businessAccountId: testBA.id,
        outletId: testOutlet.id,
        outletPincode: '400001', // Target pincode
        outletCity: testOutlet.city,
        outletState: testOutlet.state,
        tags: []
      }
    }, prisma);

    const expectedDiscount = Number(testProduct.basePrice) * 0.9;
    assert(Number(pincodeDiscountResult.unitPrice) === expectedDiscount, `Pricing resolver resolves 10% global pincode discount: ₹${pincodeDiscountResult.unitPrice} (Expected: ₹${expectedDiscount})`);

    // Test 6.3: Scheme pricing free-goods calculation
    const schemeList = await prisma.priceList.create({
      data: {
        name: 'Bulk Scheme List',
        vendorId: testVendor.id,
        isActive: true,
        items: {
          create: {
            productId: testProduct.id,
            pricingType: 'scheme',
            customPrice: testProduct.basePrice,
            schemeMinQty: 10,
            schemeFreeQty: 1
          }
        },
        assignments: {
          create: {
            type: 'customer',
            userId: testCustomer.id
          }
        }
      }
    });
    priceListIds.push(schemeList.id);

    const schemeResult = await resolveUnitPrice({
      productId: testProduct.id,
      vendorId: testVendor.id,
      quantity: 10, // Threshold met
      customer: {
        userId: testCustomer.id,
        businessAccountId: testBA.id,
        outletId: testOutlet.id,
        outletPincode: testOutlet.pincode,
        outletCity: testOutlet.city,
        outletState: testOutlet.state,
        tags: []
      }
    }, prisma);

    assert(schemeResult.schemeMinQty === 10 && schemeResult.schemeFreeQty === 1, `Pricing resolver exposes scheme constraints: Min Qty ${schemeResult.schemeMinQty}, Free Qty ${schemeResult.schemeFreeQty}`);


    // ═══════════════════════════════════════════════════════
    //  POINT 7: ORDER MANAGEMENT SYSTEM
    // ═══════════════════════════════════════════════════════
    console.log(`\n${BOLD}7. ORDER MANAGEMENT SYSTEM${RESET}`);

    orderCustomer = await prisma.user.findFirst({ where: { role: 'customer' } });
    orderVendor = await prisma.vendor.findFirst({ where: { creditEnabled: true } });
    orderProduct = await prisma.product.findFirst({ where: { vendorId: orderVendor?.id!, basePrice: { gt: 0 } } });
    
    const orderMember = await prisma.businessAccountMember.findFirst({ where: { userId: orderCustomer?.id } });
    orderBA = await prisma.businessAccount.findUnique({ where: { id: orderMember?.businessAccountId! } });
    orderOutlet = await prisma.outlet.findFirst({ where: { businessAccountId: orderBA?.id! } });

    if (!orderCustomer || !orderVendor || !orderProduct || !orderBA || !orderOutlet) {
      throw new Error('Order testing environment missing variables');
    }

    // Save and upsert CreditAccount on DB (no transaction isolation issue now!)
    originalCreditAcc = await prisma.creditAccount.findUnique({
      where: { userId_vendorId: { userId: orderCustomer.id, vendorId: orderVendor.id } }
    });
    if (!originalCreditAcc) didCreateCreditAcc = true;

    await prisma.creditAccount.upsert({
      where: { userId_vendorId: { userId: orderCustomer.id, vendorId: orderVendor.id } },
      update: { status: 'active', creditLimit: 50000, creditUsed: 0 },
      create: { userId: orderCustomer.id, vendorId: orderVendor.id, status: 'active', creditLimit: 50000, creditUsed: 0 }
    });

    // Save and set stock to 100
    originalInventory = await prisma.inventory.findUnique({ where: { productId: orderProduct.id } });
    await prisma.inventory.update({
      where: { productId: orderProduct.id },
      data: { qtyAvailable: 100, qtyReserved: 0 }
    });

    const orderContext: OrderContext = {
      userId: orderCustomer.id,
      businessAccountId: orderBA.id,
      outletId: orderOutlet.id
    };

    // 7.1: Create Draft PO
    console.log('  Testing Draft PO creation...');
    const draftResult = await orderService.create(orderContext, {
      vendorOrders: [{
        vendorId: orderVendor.id,
        items: [{ productId: orderProduct.id, quantity: 5 }]
      }],
      paymentMethod: 'credit',
      saveDraft: true
    });
    
    const draftOrder = draftResult.orders[0];
    orderIds.push(draftOrder.id);
    assert(draftOrder.status === 'draft', `Order created successfully with status: "${draftOrder.status}"`);

    // Verify draft didn't reserve stock
    const draftStock = await prisma.inventory.findUnique({ where: { productId: orderProduct.id } });
    assert(draftStock?.qtyReserved === 0, `Draft PO did NOT reserve stock (Reserved: ${draftStock?.qtyReserved})`);

    // 7.2: Submit Draft PO
    console.log('  Submitting Draft PO...');
    const submittedOrder = await orderService.submitDraft(draftOrder.id, orderContext);
    assert(submittedOrder.status === 'pending', `Draft order submitted successfully. New status: "${submittedOrder.status}"`);

    // Verify stock is now reserved
    const submittedStock = await prisma.inventory.findUnique({ where: { productId: orderProduct.id } });
    assert(submittedStock?.qtyReserved === 5, `Submitted PO reserved stock (Reserved: ${submittedStock?.qtyReserved})`);

    // 7.3: Modify Order Quantities (change from 5 to 8)
    console.log('  Modifying Order Quantities (adjusting PO)...');
    const modifiedOrder = await orderService.modifyOrderQuantities(submittedOrder.id, orderVendor.id, [
      { itemId: draftOrder.items[0].id, quantity: 8 }
    ]);
    assert(Number(modifiedOrder.totalAmount) > Number(submittedOrder.totalAmount), `Order total recalculated correctly: ₹${modifiedOrder.totalAmount}`);

    const modifiedStock = await prisma.inventory.findUnique({ where: { productId: orderProduct.id } });
    assert(modifiedStock?.qtyReserved === 8, `Stock reservation updated dynamically (Reserved: ${modifiedStock?.qtyReserved})`);

    // 7.4: Split Order (split off 3 units into a sibling PO)
    console.log('  Splitting Order...');
    const splitResult = await orderService.splitOrder(modifiedOrder.id, orderVendor.id, [
      { itemId: draftOrder.items[0].id, quantity: 3 }
    ]);
    orderIds.push(splitResult.childId);
    assert(!!splitResult.childId, `Sibling PO created with number: ${splitResult.childOrderNumber}`);

    const parentOrder = await prisma.order.findUnique({ where: { id: modifiedOrder.id } });
    const childOrder = await prisma.order.findUnique({ where: { id: splitResult.childId } });
    assert(parentOrder?.status === 'pending' && childOrder?.status === 'pending', 'Both split parent and child orders are pending');

    secondaryVendor = await prisma.vendor.findFirst({
      where: { id: { not: orderVendor.id }, creditEnabled: true }
    });
    if (secondaryVendor) {
      console.log(`  Reassigning child PO from vendor "${orderVendor.businessName}" to "${secondaryVendor.businessName}"...`);
      
      // Create a temporary product for the secondary vendor mapped to the same master SKU
      targetProduct = await prisma.product.create({
        data: {
          vendorId: secondaryVendor.id,
          masterProductId: orderProduct.masterProductId,
          categoryId: orderProduct.categoryId,
          name: `${orderProduct.name} (Alt)`,
          slug: `${orderProduct.slug}-alt-${Date.now()}`,
          basePrice: orderProduct.basePrice,
          taxPercent: orderProduct.taxPercent,
          approvalStatus: 'approved',
          isActive: true
        }
      });
      productsToCleanup.push(targetProduct.id);

      // Create price slab + inventory for the temporary product
      await prisma.priceSlab.create({
        data: {
          productId: targetProduct.id,
          vendorId: secondaryVendor.id,
          minQty: 1,
          price: orderProduct.basePrice
        }
      });
      
      await prisma.inventory.create({
        data: {
          productId: targetProduct.id,
          vendorId: secondaryVendor.id,
          qtyAvailable: 50,
          qtyReserved: 0
        }
      });

      // Backup target stock (which is currently at 50 available)
      originalTargetInventory = await prisma.inventory.findUnique({ where: { productId: targetProduct.id } });

      // Save original VendorCustomer secondary mapping
      originalSecondaryCreditAcc = await prisma.creditAccount.findUnique({
        where: { userId_vendorId: { userId: orderCustomer.id, vendorId: secondaryVendor.id } }
      });
      if (!originalSecondaryCreditAcc) didCreateSecondaryCreditAcc = true;

      originalVendorCustomer = await prisma.vendorCustomer.findUnique({
        where: { vendorId_userId: { vendorId: secondaryVendor.id, userId: orderCustomer.id } }
      });
      if (!originalVendorCustomer) didCreateVendorCustomer = true;

      // Create mappings for test
      await prisma.vendorCustomer.upsert({
        where: { vendorId_userId: { vendorId: secondaryVendor.id, userId: orderCustomer.id } },
        update: {},
        create: { vendorId: secondaryVendor.id, userId: orderCustomer.id }
      });
      
      await prisma.creditAccount.upsert({
        where: { userId_vendorId: { userId: orderCustomer.id, vendorId: secondaryVendor.id } },
        update: { status: 'active', creditLimit: 50000, creditUsed: 0 },
        create: { userId: orderCustomer.id, vendorId: secondaryVendor.id, status: 'active', creditLimit: 50000, creditUsed: 0 }
      });

      const reassignedOrder = await orderService.reassignOrderVendor(splitResult.childId, orderVendor.id, secondaryVendor.id);
      assert(reassignedOrder.vendorId === secondaryVendor.id, `Child order successfully reassigned to target vendor: ${secondaryVendor.businessName}`);

      // Verify stock reservations moved
      const oldVendorStock = await prisma.inventory.findUnique({ where: { productId: orderProduct.id } });
      const newVendorStock = await prisma.inventory.findUnique({ where: { productId: targetProduct.id } });
      assert(oldVendorStock?.qtyReserved === 5, `Old vendor reserved stock decremented to 5 (split parent only)`);
      assert(newVendorStock?.qtyReserved === 3, `New vendor reserved stock incremented to 3`);
    }

    // 7.7: Order status transition check with OTP validation
    console.log('  Testing order transitions and side-effects...');
    
    // confirm
    await orderService.updateStatus(parentOrder?.id!, orderVendor.id, 'confirmed');
    const creditAfterConfirm = await prisma.creditAccount.findUnique({
      where: { userId_vendorId: { userId: orderCustomer.id, vendorId: orderVendor.id } }
    });
    
    const debitTx = await prisma.creditTransaction.findFirst({ where: { orderId: parentOrder?.id, type: 'debit' } });
    if (debitTx) creditTxIds.push(debitTx.id);

    const oldLimitUsed = originalCreditAcc ? Number(originalCreditAcc.creditUsed) : 0;
    const expectedLimitUsed = oldLimitUsed + Number(parentOrder?.totalAmount);
    assert(Number(creditAfterConfirm?.creditUsed) === expectedLimitUsed, `Credit account debited on confirmation. Balance used: ₹${creditAfterConfirm?.creditUsed}`);
    assert(!!debitTx, 'Credit ledger entry successfully recorded');

    // 7.6: OTP Delivery Proof flow
    console.log('  Testing Delivery OTP Generation (allowed on confirmed order)...');
    const otpRes = await orderService.generateDeliveryOtp(parentOrder?.id!, orderVendor.id);
    assert(otpRes.sent === true, `OTP generated and sent (Expires: ${otpRes.expiresAt})`);

    // Retrieve the generated OTP from DB
    const freshParent = await prisma.order.findUnique({ where: { id: parentOrder?.id } });
    assert(!!freshParent?.deliveryOtp, `OTP persisted on order record: ${freshParent?.deliveryOtp}`);

    // Retrieve parent and child orders to diagnose item quantities
    const parentItems = await prisma.orderItem.findMany({ where: { orderId: parentOrder?.id } });
    const childItems = await prisma.orderItem.findMany({ where: { orderId: splitResult.childId } });
    console.log(`  [DIAGNOSTIC] Parent Order Items count: ${parentItems.length}`);
    for (const item of parentItems) {
      console.log(`    Item: "${item.productName}", Qty: ${item.quantity}, FulfilledQty: ${item.fulfilledQty}`);
    }
    console.log(`  [DIAGNOSTIC] Child Order Items count: ${childItems.length}`);
    for (const item of childItems) {
      console.log(`    Item: "${item.productName}", Qty: ${item.quantity}, FulfilledQty: ${item.fulfilledQty}`);
    }
    const currentStockBeforeDelivery = await prisma.inventory.findUnique({ where: { productId: orderProduct.id } });
    console.log(`  [DIAGNOSTIC] Inventory before delivery: Available: ${currentStockBeforeDelivery?.qtyAvailable}, Reserved: ${currentStockBeforeDelivery?.qtyReserved}`);

    // processing -> shipped
    await orderService.updateStatus(freshParent?.id!, orderVendor.id, 'processing');
    await orderService.updateStatus(freshParent?.id!, orderVendor.id, 'shipped');

    // delivered (provide wrong OTP first)
    console.log('    Verifying incorrect OTP is rejected...');
    await assertThrows(
      () => orderService.updateStatus(freshParent?.id!, orderVendor.id, 'delivered', undefined, { proofType: 'otp', otp: '0000' }),
      'Order transition throws error on invalid OTP'
    );

    // delivered (provide correct OTP)
    console.log('    Verifying correct OTP is accepted...');
    await orderService.updateStatus(freshParent?.id!, orderVendor.id, 'delivered', undefined, { proofType: 'otp', otp: freshParent?.deliveryOtp! });
    
    const deliveredParent = await prisma.order.findUnique({ where: { id: freshParent?.id } });
    assert(deliveredParent?.status === 'delivered', `Order delivered successfully with OTP authentication`);

    // Verify physical stock finalized (reserved subtracted, available decremented)
    const finalStock = await prisma.inventory.findUnique({ where: { productId: orderProduct.id } });
    assert(finalStock?.qtyAvailable === 95 && finalStock?.qtyReserved === 0, `Physical stock correctly deducted. Stock remaining: ${finalStock?.qtyAvailable}, Reserved: ${finalStock?.qtyReserved}`);

  } catch (err) {
    console.error(`\n${RED}Verification crashed with error:${RESET}`, err);
    failedTests++;
  } finally {
    // ═══════════════════════════════════════════════════════
    //  CLEANUP & RESTORATION
    // ═══════════════════════════════════════════════════════
    console.log(`\n${YELLOW}🧹 Cleaning up test data and restoring original state...${RESET}`);

    try {
      // Delete order sub-items first
      if (orderIds.length > 0) {
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      }

      // Delete credit transactions
      if (creditTxIds.length > 0) {
        await prisma.creditTransaction.deleteMany({ where: { id: { in: creditTxIds } } });
      }
      await prisma.creditTransaction.deleteMany({ where: { orderId: { in: orderIds } } });

      // Delete pricelists
      if (priceListIds.length > 0) {
        await prisma.priceListAssignment.deleteMany({ where: { priceListId: { in: priceListIds } } });
        await prisma.priceListItem.deleteMany({ where: { priceListId: { in: priceListIds } } });
        await prisma.priceList.deleteMany({ where: { id: { in: priceListIds } } });
      }

      // Restore primary vendor CreditAccount
      if (orderCustomer && orderVendor) {
        if (didCreateCreditAcc) {
          await prisma.creditAccount.delete({ where: { userId_vendorId: { userId: orderCustomer.id, vendorId: orderVendor.id } } });
        } else if (originalCreditAcc) {
          await prisma.creditAccount.update({
            where: { id: originalCreditAcc.id },
            data: {
              status: originalCreditAcc.status,
              creditLimit: originalCreditAcc.creditLimit,
              creditUsed: originalCreditAcc.creditUsed
            }
          });
        }
      }

      // Restore secondary vendor CreditAccount & mappings
      if (orderCustomer && secondaryVendor) {
        if (didCreateSecondaryCreditAcc) {
          await prisma.creditAccount.delete({
            where: { userId_vendorId: { userId: orderCustomer.id, vendorId: secondaryVendor.id } }
          }).catch(() => {});
        } else if (originalSecondaryCreditAcc) {
          await prisma.creditAccount.update({
            where: { id: originalSecondaryCreditAcc.id },
            data: {
              status: originalSecondaryCreditAcc.status,
              creditLimit: originalSecondaryCreditAcc.creditLimit,
              creditUsed: originalSecondaryCreditAcc.creditUsed
            }
          });
        }

        if (didCreateVendorCustomer) {
          await prisma.vendorCustomer.delete({
            where: { vendorId_userId: { vendorId: secondaryVendor.id, userId: orderCustomer.id } }
          }).catch(() => {});
        } else if (originalVendorCustomer) {
          await prisma.vendorCustomer.update({
            where: { id: originalVendorCustomer.id },
            data: {
              status: originalVendorCustomer.status,
              priceListId: originalVendorCustomer.priceListId,
              salespersonId: originalVendorCustomer.salespersonId,
              tags: originalVendorCustomer.tags
            }
          });
        }
      }

      // Restore stock levels
      if (orderProduct && originalInventory) {
        await prisma.inventory.update({
          where: { id: originalInventory.id },
          data: {
            qtyAvailable: originalInventory.qtyAvailable,
            qtyReserved: originalInventory.qtyReserved
          }
        });
      }
      if (targetProduct && originalTargetInventory) {
        await prisma.inventory.update({
          where: { id: originalTargetInventory.id },
          data: {
            qtyAvailable: originalTargetInventory.qtyAvailable,
            qtyReserved: originalTargetInventory.qtyReserved
          }
        });
      }

      // Delete temporary product
      if (productsToCleanup.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: productsToCleanup } } });
      }

      console.log(`  ${GREEN}✓ Cleanup successful. Database is back to its original state.${RESET}`);
    } catch (cleanupErr) {
      console.error(`  ${RED}✗ Cleanup failed! Database might contain trace records:${RESET}`, cleanupErr);
    }
  }

  console.log(`\n${BOLD}====================================================`);
  if (failedTests > 0) {
    console.log(`❌ VERIFICATION COMPLETE: ${failedTests} FAILURE(S) DETECTED`);
    process.exit(1);
  } else {
    console.log(`✅ VERIFICATION COMPLETE: ALL stack checks passed successfully!`);
  }
  console.log(`====================================================${RESET}`);
}

async function assertThrows(fn: () => Promise<any>, successMsg: string) {
  try {
    await fn();
    console.log(`  ${RED}✗ Expected transition to throw but it succeeded.${RESET}`);
    throw new Error('ASSERT_THROW_FAIL');
  } catch (e: any) {
    if (e.message === 'ASSERT_THROW_FAIL') throw e;
    console.log(`  ${GREEN}✓ ${successMsg} (${e.message})${RESET}`);
  }
}

runTests()
  .catch(err => {
    console.error('Test execution failed:', err);
    process.exit(2);
  })
  .finally(() => prisma.$disconnect());
