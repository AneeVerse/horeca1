import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ═══ ADMIN USER ═══
  const adminPw = await hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@horeca1.com' },
    update: {},
    create: {
      email: 'admin@horeca1.com',
      password: adminPw,
      fullName: 'HoReCa Admin',
      role: 'admin',
      phone: '+919999900000',
      pincode: '400001',
      emailVerified: new Date(),
    },
  });
  console.log(`  Admin: ${admin.email}`);

  // ═══ VENDOR USERS + VENDOR PROFILES ═══
  const vendorPw = await hash('vendor123', 12);

  const vendorData = [
    {
      email: 'fresh@dailyfreshfoods.com',
      fullName: 'Rajesh Kumar',
      phone: '+919876500001',
      business: {
        businessName: 'Daily Fresh Foods',
        slug: 'daily-fresh-foods',
        description: 'Premium quality fresh vegetables, fruits, and dairy delivered daily to your kitchen.',
        rating: 4.5,
        minOrderValue: 500,
        creditEnabled: true,
        isVerified: true,
      },
    },
    {
      email: 'owner@spicetrail.in',
      fullName: 'Priya Sharma',
      phone: '+919876500002',
      business: {
        businessName: 'Spice Trail India',
        slug: 'spice-trail-india',
        description: 'Authentic Indian spices, masalas, and dry ingredients sourced directly from farms.',
        rating: 4.8,
        minOrderValue: 300,
        creditEnabled: true,
        isVerified: true,
      },
    },
    {
      email: 'info@meathouseindia.com',
      fullName: 'Faizan Sheikh',
      phone: '+919876500003',
      business: {
        businessName: 'MeatHouse India',
        slug: 'meathouse-india',
        description: 'FSSAI-certified fresh and frozen meats, poultry, and seafood for restaurants.',
        rating: 4.3,
        minOrderValue: 1000,
        creditEnabled: false,
        isVerified: true,
      },
    },
    {
      email: 'sales@beverageco.in',
      fullName: 'Amit Patel',
      phone: '+919876500004',
      business: {
        businessName: 'BeverageCo',
        slug: 'beverageco',
        description: 'Complete beverage solutions — soft drinks, juices, water, tea, and coffee for HORECA.',
        rating: 4.1,
        minOrderValue: 800,
        creditEnabled: true,
        isVerified: true,
      },
    },
    {
      email: 'orders@packnserve.in',
      fullName: 'Sneha Reddy',
      phone: '+919876500005',
      business: {
        businessName: 'Pack & Serve Supplies',
        slug: 'pack-and-serve-supplies',
        description: 'Disposable packaging, kitchen supplies, and cleaning essentials for food businesses.',
        rating: 4.0,
        minOrderValue: 200,
        creditEnabled: false,
        isVerified: true,
      },
    },
  ];

  const vendors: Array<{ id: string; businessName: string }> = [];
  const vendorUsers: string[] = [];

  for (const v of vendorData) {
    const user = await prisma.user.upsert({
      where: { email: v.email },
      update: {},
      create: {
        email: v.email,
        password: vendorPw,
        fullName: v.fullName,
        phone: v.phone,
        role: 'vendor',
        pincode: '400001',
        businessName: v.business.businessName,
        emailVerified: new Date(),
      },
    });
    vendorUsers.push(user.id);

    const vendor = await prisma.vendor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        ...v.business,
        rating: v.business.rating,
        minOrderValue: v.business.minOrderValue,
      },
    });
    vendors.push({ id: vendor.id, businessName: vendor.businessName });
    console.log(`  Vendor: ${vendor.businessName}`);
  }

  // ═══ CUSTOMER USERS ═══
  const customerPw = await hash('customer123', 12);

  const customerData = [
    { email: 'chef@tajpalace.com', fullName: 'Vikram Singh', phone: '+919876600001', businessName: 'Taj Palace Restaurant', pincode: '400001' },
    { email: 'owner@greenleafcafe.com', fullName: 'Ananya Menon', phone: '+919876600002', businessName: 'Green Leaf Cafe', pincode: '400002' },
    { email: 'kitchen@grandhyatt.com', fullName: 'Suresh Nair', phone: '+919876600003', businessName: 'Grand Hyatt Kitchen', pincode: '400001' },
  ];

  const customers: string[] = [];
  for (const c of customerData) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        password: customerPw,
        fullName: c.fullName,
        phone: c.phone,
        role: 'customer',
        pincode: c.pincode,
        businessName: c.businessName,
        emailVerified: new Date(),
      },
    });
    customers.push(user.id);
    console.log(`  Customer: ${user.fullName} (${c.businessName})`);
  }

  // ═══ CATEGORIES ═══
  const categoryData = [
    { name: 'Vegetables', slug: 'vegetables', sortOrder: 1 },
    { name: 'Fruits', slug: 'fruits', sortOrder: 2 },
    { name: 'Dairy & Eggs', slug: 'dairy-eggs', sortOrder: 3 },
    { name: 'Spices & Masala', slug: 'spices-masala', sortOrder: 4 },
    { name: 'Grains & Pulses', slug: 'grains-pulses', sortOrder: 5 },
    { name: 'Meat & Poultry', slug: 'meat-poultry', sortOrder: 6 },
    { name: 'Seafood', slug: 'seafood', sortOrder: 7 },
    { name: 'Beverages', slug: 'beverages', sortOrder: 8 },
    { name: 'Oils & Ghee', slug: 'oils-ghee', sortOrder: 9 },
    { name: 'Packaging & Supplies', slug: 'packaging-supplies', sortOrder: 10 },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoryData) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories[cat.slug] = c.id;
  }
  console.log(`  Categories: ${Object.keys(categories).length} created`);

  // ═══ PRODUCTS + PRICE SLABS + INVENTORY ═══
  // Vendor 0: Daily Fresh Foods — vegetables, fruits, dairy
  const freshFoodsProducts = [
    { name: 'Fresh Onions', slug: 'fresh-onions', categorySlug: 'vegetables', basePrice: 35, packSize: '1 kg', unit: 'kg', stock: 500 },
    { name: 'Tomatoes (Hybrid)', slug: 'tomatoes-hybrid', categorySlug: 'vegetables', basePrice: 40, packSize: '1 kg', unit: 'kg', stock: 400 },
    { name: 'Potatoes', slug: 'potatoes', categorySlug: 'vegetables', basePrice: 30, packSize: '1 kg', unit: 'kg', stock: 600 },
    { name: 'Green Capsicum', slug: 'green-capsicum', categorySlug: 'vegetables', basePrice: 80, packSize: '1 kg', unit: 'kg', stock: 200 },
    { name: 'Fresh Coriander', slug: 'fresh-coriander', categorySlug: 'vegetables', basePrice: 15, packSize: '100 g', unit: 'bundle', stock: 300 },
    { name: 'Alphonso Mangoes', slug: 'alphonso-mangoes', categorySlug: 'fruits', basePrice: 600, packSize: '1 dozen', unit: 'dozen', stock: 100 },
    { name: 'Bananas (Robusta)', slug: 'bananas-robusta', categorySlug: 'fruits', basePrice: 45, packSize: '1 dozen', unit: 'dozen', stock: 250 },
    { name: 'Amul Butter (500g)', slug: 'amul-butter-500g', categorySlug: 'dairy-eggs', basePrice: 270, packSize: '500 g', unit: 'pack', stock: 150 },
    { name: 'Farm Eggs (30 pcs)', slug: 'farm-eggs-30', categorySlug: 'dairy-eggs', basePrice: 210, packSize: '30 pcs', unit: 'tray', stock: 200 },
    { name: 'Paneer (1kg block)', slug: 'paneer-1kg', categorySlug: 'dairy-eggs', basePrice: 320, packSize: '1 kg', unit: 'block', stock: 120 },
  ];

  // Vendor 1: Spice Trail — spices, grains, oils
  const spiceTrailProducts = [
    { name: 'Turmeric Powder', slug: 'turmeric-powder', categorySlug: 'spices-masala', basePrice: 180, packSize: '500 g', unit: 'pack', stock: 300 },
    { name: 'Red Chilli Powder', slug: 'red-chilli-powder', categorySlug: 'spices-masala', basePrice: 220, packSize: '500 g', unit: 'pack', stock: 250 },
    { name: 'Garam Masala', slug: 'garam-masala', categorySlug: 'spices-masala', basePrice: 350, packSize: '500 g', unit: 'pack', stock: 200 },
    { name: 'Cumin Seeds (Jeera)', slug: 'cumin-seeds', categorySlug: 'spices-masala', basePrice: 280, packSize: '500 g', unit: 'pack', stock: 180 },
    { name: 'Black Pepper Whole', slug: 'black-pepper-whole', categorySlug: 'spices-masala', basePrice: 450, packSize: '250 g', unit: 'pack', stock: 150 },
    { name: 'Basmati Rice (5kg)', slug: 'basmati-rice-5kg', categorySlug: 'grains-pulses', basePrice: 520, packSize: '5 kg', unit: 'bag', stock: 200 },
    { name: 'Toor Dal (1kg)', slug: 'toor-dal-1kg', categorySlug: 'grains-pulses', basePrice: 160, packSize: '1 kg', unit: 'pack', stock: 300 },
    { name: 'Moong Dal (1kg)', slug: 'moong-dal-1kg', categorySlug: 'grains-pulses', basePrice: 140, packSize: '1 kg', unit: 'pack', stock: 280 },
    { name: 'Mustard Oil (5L)', slug: 'mustard-oil-5l', categorySlug: 'oils-ghee', basePrice: 750, packSize: '5 L', unit: 'can', stock: 100 },
    { name: 'Pure Desi Ghee (1L)', slug: 'desi-ghee-1l', categorySlug: 'oils-ghee', basePrice: 580, packSize: '1 L', unit: 'jar', stock: 120 },
  ];

  // Vendor 2: MeatHouse — meat, poultry, seafood
  const meatHouseProducts = [
    { name: 'Chicken Breast (Boneless)', slug: 'chicken-breast-boneless', categorySlug: 'meat-poultry', basePrice: 280, packSize: '1 kg', unit: 'kg', stock: 200 },
    { name: 'Chicken Drumsticks', slug: 'chicken-drumsticks', categorySlug: 'meat-poultry', basePrice: 220, packSize: '1 kg', unit: 'kg', stock: 250 },
    { name: 'Mutton (Bone-In)', slug: 'mutton-bone-in', categorySlug: 'meat-poultry', basePrice: 750, packSize: '1 kg', unit: 'kg', stock: 100 },
    { name: 'Lamb Keema', slug: 'lamb-keema', categorySlug: 'meat-poultry', basePrice: 680, packSize: '1 kg', unit: 'kg', stock: 80 },
    { name: 'Prawns (Large)', slug: 'prawns-large', categorySlug: 'seafood', basePrice: 650, packSize: '500 g', unit: 'pack', stock: 60 },
    { name: 'Fish Fillets (Basa)', slug: 'fish-fillets-basa', categorySlug: 'seafood', basePrice: 350, packSize: '1 kg', unit: 'kg', stock: 120 },
    { name: 'Surmai Steaks', slug: 'surmai-steaks', categorySlug: 'seafood', basePrice: 800, packSize: '1 kg', unit: 'kg', stock: 50 },
    { name: 'Whole Chicken', slug: 'whole-chicken', categorySlug: 'meat-poultry', basePrice: 380, packSize: '~1.2 kg', unit: 'piece', stock: 150 },
  ];

  // Vendor 3: BeverageCo — beverages
  const beverageCoProducts = [
    { name: 'Coca-Cola (300ml x 24)', slug: 'coca-cola-300ml-24', categorySlug: 'beverages', basePrice: 480, packSize: '24 bottles', unit: 'case', stock: 200 },
    { name: 'Thumbs Up (250ml x 24)', slug: 'thumbs-up-250ml-24', categorySlug: 'beverages', basePrice: 420, packSize: '24 bottles', unit: 'case', stock: 180 },
    { name: 'Bisleri Water (1L x 12)', slug: 'bisleri-water-1l-12', categorySlug: 'beverages', basePrice: 180, packSize: '12 bottles', unit: 'case', stock: 400 },
    { name: 'Red Bull (250ml x 24)', slug: 'redbull-250ml-24', categorySlug: 'beverages', basePrice: 2400, packSize: '24 cans', unit: 'case', stock: 80 },
    { name: 'Tata Tea Gold (1kg)', slug: 'tata-tea-gold-1kg', categorySlug: 'beverages', basePrice: 520, packSize: '1 kg', unit: 'pack', stock: 150 },
    { name: 'Nescafe Classic (200g)', slug: 'nescafe-classic-200g', categorySlug: 'beverages', basePrice: 350, packSize: '200 g', unit: 'jar', stock: 200 },
    { name: 'Real Juice Mango (1L x 12)', slug: 'real-juice-mango-1l-12', categorySlug: 'beverages', basePrice: 720, packSize: '12 packs', unit: 'case', stock: 100 },
  ];

  // Vendor 4: Pack & Serve — packaging
  const packServeProducts = [
    { name: 'Disposable Plates (100 pcs)', slug: 'disposable-plates-100', categorySlug: 'packaging-supplies', basePrice: 180, packSize: '100 pcs', unit: 'pack', stock: 500 },
    { name: 'Aluminium Foil Roll (72m)', slug: 'aluminium-foil-72m', categorySlug: 'packaging-supplies', basePrice: 350, packSize: '72 m', unit: 'roll', stock: 300 },
    { name: 'Cling Wrap (300m)', slug: 'cling-wrap-300m', categorySlug: 'packaging-supplies', basePrice: 280, packSize: '300 m', unit: 'roll', stock: 250 },
    { name: 'Paper Napkins (1000 pcs)', slug: 'paper-napkins-1000', categorySlug: 'packaging-supplies', basePrice: 220, packSize: '1000 pcs', unit: 'pack', stock: 400 },
    { name: 'Takeaway Containers (500ml x 50)', slug: 'takeaway-containers-500ml', categorySlug: 'packaging-supplies', basePrice: 320, packSize: '50 pcs', unit: 'pack', stock: 350 },
    { name: 'Kitchen Gloves (100 pcs)', slug: 'kitchen-gloves-100', categorySlug: 'packaging-supplies', basePrice: 250, packSize: '100 pcs', unit: 'box', stock: 200 },
    { name: 'Garbage Bags (Large x 50)', slug: 'garbage-bags-large-50', categorySlug: 'packaging-supplies', basePrice: 180, packSize: '50 pcs', unit: 'pack', stock: 300 },
    { name: 'Tissue Paper Roll (6 pack)', slug: 'tissue-paper-roll-6', categorySlug: 'packaging-supplies', basePrice: 150, packSize: '6 rolls', unit: 'pack', stock: 250 },
  ];

  const allVendorProducts = [
    { vendorIdx: 0, products: freshFoodsProducts },
    { vendorIdx: 1, products: spiceTrailProducts },
    { vendorIdx: 2, products: meatHouseProducts },
    { vendorIdx: 3, products: beverageCoProducts },
    { vendorIdx: 4, products: packServeProducts },
  ];

  let totalProducts = 0;
  for (const { vendorIdx, products } of allVendorProducts) {
    const vendor = vendors[vendorIdx];
    for (const p of products) {
      const product = await prisma.product.upsert({
        where: { vendorId_slug: { vendorId: vendor.id, slug: p.slug } },
        update: {},
        create: {
          vendorId: vendor.id,
          categoryId: categories[p.categorySlug],
          name: p.name,
          slug: p.slug,
          basePrice: p.basePrice,
          packSize: p.packSize,
          unit: p.unit,
          creditEligible: vendorIdx < 2, // first 2 vendors have credit
        },
      });

      // Price slabs — bulk discounts (5%, 10%, 15% off at higher quantities)
      await prisma.priceSlab.upsert({
        where: { productId_minQty: { productId: product.id, minQty: 1 } },
        update: {},
        create: { productId: product.id, vendorId: vendor.id, minQty: 1, maxQty: 9, price: p.basePrice, sortOrder: 0 },
      });
      await prisma.priceSlab.upsert({
        where: { productId_minQty: { productId: product.id, minQty: 10 } },
        update: {},
        create: { productId: product.id, vendorId: vendor.id, minQty: 10, maxQty: 49, price: Math.round(p.basePrice * 0.95), sortOrder: 1 },
      });
      await prisma.priceSlab.upsert({
        where: { productId_minQty: { productId: product.id, minQty: 50 } },
        update: {},
        create: { productId: product.id, vendorId: vendor.id, minQty: 50, maxQty: null, price: Math.round(p.basePrice * 0.90), sortOrder: 2 },
      });

      // Inventory
      await prisma.inventory.upsert({
        where: { productId: product.id },
        update: {},
        create: { productId: product.id, vendorId: vendor.id, qtyAvailable: p.stock, lowStockThreshold: Math.max(10, Math.round(p.stock * 0.1)) },
      });

      totalProducts++;
    }
  }
  console.log(`  Products: ${totalProducts} with price slabs + inventory`);

  // ═══ SERVICE AREAS ═══
  const pincodes = ['400001', '400002', '400003', '400004', '400005', '400006', '400007', '400008'];
  for (const vendor of vendors) {
    const servicePincodes = vendor.businessName === 'MeatHouse India'
      ? pincodes.slice(0, 4)   // MeatHouse serves fewer areas
      : pincodes;              // Others serve all areas

    for (const pincode of servicePincodes) {
      await prisma.serviceArea.upsert({
        where: { vendorId_pincode: { vendorId: vendor.id, pincode } },
        update: {},
        create: { vendorId: vendor.id, pincode },
      });
    }
  }
  console.log(`  Service areas: ${vendors.length} vendors × pincodes`);

  // ═══ DELIVERY SLOTS ═══
  // Mon-Sat (1-6), two slots per day
  for (const vendor of vendors) {
    for (let day = 1; day <= 6; day++) {
      await prisma.deliverySlot.upsert({
        where: { vendorId_dayOfWeek_slotStart: { vendorId: vendor.id, dayOfWeek: day, slotStart: '06:00' } },
        update: {},
        create: { vendorId: vendor.id, dayOfWeek: day, slotStart: '06:00', slotEnd: '10:00', cutoffTime: '22:00' },
      });
      await prisma.deliverySlot.upsert({
        where: { vendorId_dayOfWeek_slotStart: { vendorId: vendor.id, dayOfWeek: day, slotStart: '14:00' } },
        update: {},
        create: { vendorId: vendor.id, dayOfWeek: day, slotStart: '14:00', slotEnd: '18:00', cutoffTime: '10:00' },
      });
    }
  }
  console.log(`  Delivery slots: Mon-Sat, 2 slots/day/vendor`);

  // ═══ CUSTOMER-VENDOR RELATIONSHIPS ═══
  // Customer 0 follows all vendors
  for (const vendor of vendors) {
    await prisma.customerVendor.upsert({
      where: { userId_vendorId: { userId: customers[0], vendorId: vendor.id } },
      update: {},
      create: { userId: customers[0], vendorId: vendor.id, isFavorite: true },
    });
  }
  // Customer 1 follows first 3
  for (let i = 0; i < 3; i++) {
    await prisma.customerVendor.upsert({
      where: { userId_vendorId: { userId: customers[1], vendorId: vendors[i].id } },
      update: {},
      create: { userId: customers[1], vendorId: vendors[i].id, isFavorite: i === 0 },
    });
  }
  console.log(`  Customer-vendor relationships created`);

  // ═══ COLLECTIONS ═══
  const collectionData = [
    { name: 'Weekend Specials', slug: 'weekend-specials', description: 'Top picks for weekend menu prep', sortOrder: 1 },
    { name: 'Kitchen Essentials', slug: 'kitchen-essentials', description: 'Must-have staples for every kitchen', sortOrder: 2 },
    { name: 'New Arrivals', slug: 'new-arrivals', description: 'Fresh additions from our vendors', sortOrder: 3 },
  ];

  for (const col of collectionData) {
    await prisma.collection.upsert({
      where: { slug: col.slug },
      update: {},
      create: col,
    });
  }
  console.log(`  Collections: ${collectionData.length} created`);

  // ═══ CREDIT ACCOUNTS ═══
  // Customer 0 has active credit with Daily Fresh Foods
  await prisma.creditAccount.upsert({
    where: { userId_vendorId: { userId: customers[0], vendorId: vendors[0].id } },
    update: {},
    create: {
      userId: customers[0],
      vendorId: vendors[0].id,
      creditLimit: 50000,
      creditUsed: 12500,
      status: 'active',
    },
  });
  // Customer 0 also has credit with Spice Trail
  await prisma.creditAccount.upsert({
    where: { userId_vendorId: { userId: customers[0], vendorId: vendors[1].id } },
    update: {},
    create: {
      userId: customers[0],
      vendorId: vendors[1].id,
      creditLimit: 25000,
      creditUsed: 0,
      status: 'active',
    },
  });
  console.log(`  Credit accounts created`);

  // ═══ WALLETS ═══
  for (const customerId of customers) {
    await prisma.wallet.upsert({
      where: { userId: customerId },
      update: {},
      create: { userId: customerId, balance: 0 },
    });
  }
  console.log(`  Wallets: ${customers.length} created`);

  console.log('\n✅ Seed complete!');
  console.log('\nLogin credentials:');
  console.log('  Admin:    admin@horeca1.com / admin123');
  console.log('  Vendor:   fresh@dailyfreshfoods.com / vendor123');
  console.log('  Customer: chef@tajpalace.com / customer123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
