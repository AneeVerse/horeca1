// ============================================================
// Horeca1 V2.2 — Mock Data for UI Development
// ============================================================

import type { Vendor, VendorProduct, Category, OrderList, PurchaseOrder, VendorSummary } from '@/types';

// ---- VENDORS ----

export const MOCK_VENDORS: Vendor[] = [
    {
        id: 'v1',
        name: 'Sharad Dairy',
        slug: 'sharad-dairy',
        logo: '/images/top vendors/emarket.png',
        rating: 4.6,
        totalRatings: 234,
        deliverySchedule: 'Tomorrow 7:00 AM',
        deliveryTime: '24 hrs',
        minOrderValue: 500,
        creditEnabled: true,
        creditAmount: 25000,
        categories: ['Grocery', 'Vegetable', 'Cleaning'],
        isActive: true,
        description: 'Your everyday grocery and household needs.',
    },
    {
        id: 'v2',
        name: 'Whole Food Market',
        slug: 'whole-foods',
        logo: '/images/top vendors/whole-foods-market.png',
        rating: 4.8,
        totalRatings: 312,
        deliverySchedule: 'Today 4:00 PM',
        deliveryTime: '6 hrs',
        minOrderValue: 300,
        creditEnabled: true,
        creditAmount: 50000,
        categories: ['Organic', 'Fruits', 'Vegetables'],
        isActive: true,
        description: 'Organic and whole grain superstore.',
    },
    {
        id: 'v3',
        name: 'M Mart',
        slug: 'm-mart',
        logo: '/images/top vendors/m-mart.png',
        rating: 4.3,
        totalRatings: 189,
        deliverySchedule: 'Tomorrow 6:00 AM',
        deliveryTime: '18 hrs',
        minOrderValue: 1000,
        creditEnabled: false,
        categories: ['Imported', 'Frozen', 'Grocery'],
        isActive: true,
        description: 'Imported, frozen, and ready-to-eat specialists.',
    },
    {
        id: 'v4',
        name: 'Gokul Dairy',
        slug: 'gokul-dairy',
        logo: '/images/top vendors/groceri.png',
        rating: 4.2,
        totalRatings: 156,
        deliverySchedule: 'Tomorrow 5:30 AM',
        deliveryTime: '20 hrs',
        minOrderValue: 400,
        creditEnabled: true,
        creditAmount: 15000,
        categories: ['Groceries', 'Daily Essentials'],
        isActive: true,
        description: 'Complete grocery and daily essentials.',
    },
    {
        id: 'v5',
        name: 'Borcelle',
        slug: 'borcelle',
        logo: '/images/top vendors/961d17c25868145dd167df9f88ca0d40a7c057d1.png',
        rating: 4.7,
        totalRatings: 201,
        deliverySchedule: 'Tomorrow 8:00 AM',
        deliveryTime: '22 hrs',
        minOrderValue: 600,
        creditEnabled: true,
        creditAmount: 30000,
        categories: ['Grocery', 'Dry Fruits', 'Organic'],
        isActive: true,
        description: 'Organic and dry fruits specialists.',
    },
    {
        id: 'v6',
        name: 'Bakers Hub',
        slug: 'bakers-hub',
        logo: '/images/top vendors/39a5dd37096e44eb8b72e053055e32896d63c44a.png',
        rating: 4.4,
        totalRatings: 98,
        deliverySchedule: 'Tomorrow 10:00 AM',
        deliveryTime: '24 hrs',
        minOrderValue: 750,
        creditEnabled: false,
        categories: ['Grocery'],
        isActive: true,
        description: 'Fresh grocery delivered daily.',
    },
    {
        id: 'v7',
        name: 'Mentari Mart',
        slug: 'mentari-mart',
        logo: '/images/top vendors/658b597eb627e280b99c0cf10e482793 2.png',
        rating: 4.5,
        totalRatings: 110,
        deliverySchedule: 'Tomorrow 9:00 AM',
        deliveryTime: '12 hrs',
        minOrderValue: 350,
        creditEnabled: true,
        categories: ['Grocery', 'Vegetables'],
        isActive: true,
        description: 'Grocery & Vegetables marketplace.',
    },
    {
        id: 'v8',
        name: 'Walmart',
        slug: 'walmart',
        logo: '/images/top vendors/ecommerce-logo-template_658705-117 3.png',
        rating: 4.9,
        totalRatings: 1200,
        deliverySchedule: 'Today 8:00 PM',
        deliveryTime: '4 hrs',
        minOrderValue: 500,
        creditEnabled: true,
        categories: ['Everything', 'Grocery'],
        isActive: true,
        description: 'Grocery, Electronics and more.',
    },
    {
        id: 'v9',
        name: 'Allure Mart',
        slug: 'allure-mart',
        logo: '/images/top vendors/da025fadd66fb2aef4d63f0db58b86b5 2.png',
        rating: 4.4,
        totalRatings: 150,
        deliverySchedule: 'Tomorrow 11:00 AM',
        deliveryTime: '24 hrs',
        minOrderValue: 750,
        creditEnabled: false,
        categories: ['Grocery', 'Beauty'],
        isActive: true,
        description: 'Premium grocery and beauty products.',
    },
    {
        id: 'v10',
        name: 'Cartomart',
        slug: 'cartomart',
        logo: '/images/top vendors/m-mart-grocery-store-brands-logo-238132857 3.png',
        rating: 4.3,
        totalRatings: 85,
        deliverySchedule: 'Tomorrow 7:00 AM',
        deliveryTime: '24 hrs',
        minOrderValue: 600,
        creditEnabled: true,
        categories: ['Grocery', 'Bulk'],
        isActive: true,
        description: 'Grocery and dry fruits center.',
    },
];

export const MOCK_VENDOR_SUMMARIES: VendorSummary[] = MOCK_VENDORS.map(v => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    logo: v.logo,
    rating: v.rating,
    deliveryTime: v.deliveryTime,
    minOrderValue: v.minOrderValue,
    creditEnabled: v.creditEnabled,
    categories: v.categories,
}));

// ---- PRODUCTS (PER VENDOR) ----

const productBase = {
    images: ['/images/recom-product/product-img10.png'],
    stock: 100,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

export const MOCK_VENDOR_PRODUCTS: Record<string, VendorProduct[]> = {
    v1: [
        { ...productBase, id: 'p1', images: ['/images/category/milk.png'], name: 'Amul Butter', description: 'Pure salted butter', price: 420, originalPrice: 450, category: 'Dairy', subcategory: 'Butter', packSize: '1 kg', unit: 'kg', vendorId: 'v1', vendorName: 'Sharad Dairy', bulkPrices: [{ minQty: 5, price: 410 }, { minQty: 10, price: 400 }], creditBadge: true, minOrderQuantity: 1, frequentlyOrdered: true },
        { ...productBase, id: 'p2', images: ['/images/category/dairy.png'], name: 'Amul Cheese Block', description: 'Processed cheese block', price: 380, category: 'Dairy', subcategory: 'Cheese', packSize: '1 kg', unit: 'kg', vendorId: 'v1', vendorName: 'Sharad Dairy', bulkPrices: [{ minQty: 5, price: 365 }, { minQty: 10, price: 350 }], creditBadge: true, minOrderQuantity: 1, frequentlyOrdered: true },
        { ...productBase, id: 'p3', images: ['/images/category/milk.png'], name: 'Fresh Paneer', description: 'Farm fresh paneer', price: 320, category: 'Dairy', subcategory: 'Paneer', packSize: '1 kg', unit: 'kg', vendorId: 'v1', vendorName: 'Sharad Dairy', bulkPrices: [{ minQty: 5, price: 310 }], creditBadge: true, minOrderQuantity: 1, stock: 0, isActive: false },
        { ...productBase, id: 'p4', images: ['/images/category/milk.png'], name: 'Full Cream Milk', description: 'Full cream pasteurized milk', price: 56, category: 'Dairy', subcategory: 'Milk', packSize: '1 L', unit: 'L', vendorId: 'v1', vendorName: 'Sharad Dairy', bulkPrices: [{ minQty: 10, price: 52 }, { minQty: 20, price: 50 }], creditBadge: false, minOrderQuantity: 5 },
        { ...productBase, id: 'p5', images: ['/images/category/dairy.png'], name: 'Mozzarella Cheese', description: 'Shredded mozzarella for pizza', price: 490, category: 'Dairy', subcategory: 'Cheese', packSize: '1 kg', unit: 'kg', vendorId: 'v1', vendorName: 'Sharad Dairy', bulkPrices: [{ minQty: 3, price: 470 }], creditBadge: true, minOrderQuantity: 1, isDeal: true },
        { ...productBase, id: 'p6', images: ['/images/category/milk.png'], name: 'Salted Butter Pats', description: 'Individual butter portions', price: 180, category: 'Dairy', subcategory: 'Butter', packSize: '500 g', unit: 'g', vendorId: 'v1', vendorName: 'Sharad Dairy', bulkPrices: [], creditBadge: false, minOrderQuantity: 2 },
    ],
    v2: [
        { ...productBase, id: 'p7', images: ['/images/product/product-img1.png'], name: 'Kissan Tomato Ketchup', description: 'Classic tomato ketchup', price: 145, category: 'Sauces', subcategory: 'Ketchup', packSize: '1 kg', unit: 'kg', vendorId: 'v2', vendorName: 'Metro Foods', bulkPrices: [{ minQty: 5, price: 135 }], creditBadge: true, minOrderQuantity: 1, frequentlyOrdered: true },
        { ...productBase, id: 'p8', images: ['/images/category/oils.png'], name: 'Saffola Gold Oil', description: 'Refined cooking oil', price: 210, category: 'Oils', subcategory: 'Cooking Oil', packSize: '1 L', unit: 'L', vendorId: 'v2', vendorName: 'Metro Foods', bulkPrices: [{ minQty: 5, price: 200 }, { minQty: 10, price: 190 }], creditBadge: true, minOrderQuantity: 1 },
        { ...productBase, id: 'p9', images: ['/images/category/grains.png'], name: 'Basmati Rice', description: 'Premium long grain basmati', price: 1200, category: 'Grains', subcategory: 'Rice', packSize: '10 kg', unit: 'kg', vendorId: 'v2', vendorName: 'Metro Foods', bulkPrices: [{ minQty: 3, price: 1150 }], creditBadge: false, minOrderQuantity: 1, frequentlyOrdered: true },
        { ...productBase, id: 'p10', images: ['/images/category/drink-juice.png'], name: 'Soya Sauce', description: 'Dark soya sauce', price: 95, category: 'Sauces', subcategory: 'Asian', packSize: '500 ml', unit: 'ml', vendorId: 'v2', vendorName: 'Metro Foods', bulkPrices: [], creditBadge: true, minOrderQuantity: 2 },
        { ...productBase, id: 'p11', images: ['/images/category/oils.png'], name: 'Olive Oil Extra Virgin', description: 'Cold pressed olive oil', price: 650, category: 'Oils', subcategory: 'Olive Oil', packSize: '1 L', unit: 'L', vendorId: 'v2', vendorName: 'Metro Foods', bulkPrices: [{ minQty: 3, price: 620 }], creditBadge: false, minOrderQuantity: 1, isDeal: true, stock: 0, isActive: false },
        { ...productBase, id: 'p12', images: ['/images/category/snacks.png'], name: 'Atta Whole Wheat', description: 'Chakki fresh atta', price: 480, category: 'Grains', subcategory: 'Flour', packSize: '10 kg', unit: 'kg', vendorId: 'v2', vendorName: 'Metro Foods', bulkPrices: [{ minQty: 5, price: 460 }], creditBadge: true, minOrderQuantity: 1 },
    ],
    v3: [
        { ...productBase, id: 'p13', images: ['/images/product/product-img3.png'], name: 'Fresh Tomatoes', description: 'Farm fresh red tomatoes', price: 40, category: 'Vegetables', subcategory: 'Tomato', packSize: '1 kg', unit: 'kg', vendorId: 'v3', vendorName: 'Fresh Harvest', bulkPrices: [{ minQty: 10, price: 35 }], creditBadge: false, minOrderQuantity: 2, frequentlyOrdered: true },
        { ...productBase, id: 'p14', images: ['/images/product/product-img5.png'], name: 'Onions', description: 'Premium quality onions', price: 35, category: 'Vegetables', subcategory: 'Onion', packSize: '1 kg', unit: 'kg', vendorId: 'v3', vendorName: 'Fresh Harvest', bulkPrices: [{ minQty: 10, price: 30 }], creditBadge: false, minOrderQuantity: 5, stock: 0, isActive: false },
        { ...productBase, id: 'p15', images: ['/images/recom-product/product-img10.png'], name: 'Green Capsicum', description: 'Fresh green bell peppers', price: 80, category: 'Vegetables', subcategory: 'Capsicum', packSize: '1 kg', unit: 'kg', vendorId: 'v3', vendorName: 'Fresh Harvest', bulkPrices: [], creditBadge: false, minOrderQuantity: 1, frequentlyOrdered: true },
        { ...productBase, id: 'p16', images: ['/images/product/brokali.png'], name: 'Fresh Coriander', description: 'Bunch of fresh coriander', price: 15, category: 'Herbs', subcategory: 'Coriander', packSize: '100 g', unit: 'g', vendorId: 'v3', vendorName: 'Fresh Harvest', bulkPrices: [], creditBadge: false, minOrderQuantity: 5 },
    ],
    v4: [
        { ...productBase, id: 'p17', images: ['/images/category/milk.png'], name: 'Gokul Paneer', description: 'Soft fresh paneer', price: 300, category: 'Dairy', subcategory: 'Paneer', packSize: '1 kg', unit: 'kg', vendorId: 'v4', vendorName: 'Gokul Dairy', bulkPrices: [{ minQty: 5, price: 285 }], creditBadge: true, minOrderQuantity: 1, frequentlyOrdered: true },
        { ...productBase, id: 'p18', images: ['/images/category/dairy.png'], name: 'Gokul Curd', description: 'Fresh set curd', price: 45, category: 'Dairy', subcategory: 'Curd', packSize: '1 kg', unit: 'kg', vendorId: 'v4', vendorName: 'Gokul Dairy', bulkPrices: [{ minQty: 10, price: 40 }], creditBadge: true, minOrderQuantity: 2 },
    ],
    v5: [
        { ...productBase, id: 'p19', images: ['/images/category/spices.png'], name: 'Red Chilli Powder', description: 'Kashmiri red chilli', price: 350, category: 'Spices', subcategory: 'Chilli', packSize: '500 g', unit: 'g', vendorId: 'v5', vendorName: 'Spice Kingdom', bulkPrices: [{ minQty: 5, price: 330 }], creditBadge: false, minOrderQuantity: 1, frequentlyOrdered: true },
        { ...productBase, id: 'p20', images: ['/images/category/grains.png'], name: 'Turmeric Powder', description: 'Pure haldi powder', price: 280, category: 'Spices', subcategory: 'Turmeric', packSize: '500 g', unit: 'g', vendorId: 'v5', vendorName: 'Spice Kingdom', bulkPrices: [{ minQty: 5, price: 265 }], creditBadge: false, minOrderQuantity: 1 },
        { ...productBase, id: 'p21', images: ['/images/category/drink-juice.png'], name: 'Garam Masala', description: 'Whole spice blend', price: 420, category: 'Masalas', subcategory: 'Blends', packSize: '500 g', unit: 'g', vendorId: 'v5', vendorName: 'Spice Kingdom', bulkPrices: [], creditBadge: false, minOrderQuantity: 1, isDeal: true },
    ],
    v6: [
        { ...productBase, id: 'p22', images: ['/images/category/snacks.png'], name: 'Maida (Refined Flour)', description: 'Fine maida for baking', price: 320, category: 'Bakery', subcategory: 'Flour', packSize: '10 kg', unit: 'kg', vendorId: 'v6', vendorName: 'Bakers Hub', bulkPrices: [{ minQty: 5, price: 300 }], creditBadge: true, minOrderQuantity: 1, frequentlyOrdered: true },
        { ...productBase, id: 'p23', images: ['/images/category/candy.png'], name: 'Dark Chocolate Couverture', description: '70% dark chocolate', price: 850, category: 'Bakery', subcategory: 'Chocolate', packSize: '1 kg', unit: 'kg', vendorId: 'v6', vendorName: 'Bakers Hub', bulkPrices: [{ minQty: 3, price: 810 }], creditBadge: true, minOrderQuantity: 1, isDeal: true, stock: 0, isActive: false },
        { ...productBase, id: 'p24', images: ['/images/category/desset.png'], name: 'Vanilla Essence', description: 'Pure vanilla extract', price: 180, category: 'Bakery', subcategory: 'Essences', packSize: '500 ml', unit: 'ml', vendorId: 'v6', vendorName: 'Bakers Hub', bulkPrices: [], creditBadge: false, minOrderQuantity: 1 },
    ],
};


// ---- ALL PRODUCTS FLAT (for search) ----

export const ALL_MOCK_PRODUCTS: VendorProduct[] = Object.values(MOCK_VENDOR_PRODUCTS).flat();

// ---- CATEGORIES ----

export const MOCK_CATEGORIES: Category[] = [
    { id: 'c1', name: 'Dairy', slug: 'dairy', image: '/images/category/dairy.png', icon: '🧀', itemCount: 24, isActive: true },
    { id: 'c2', name: 'Vegetables', slug: 'vegetables', image: '/images/category/vegetables.png', icon: '🥬', itemCount: 18, isActive: true },
    { id: 'c3', name: 'Fruits', slug: 'fruits', image: '/images/category/fruits.png', icon: '🍎', itemCount: 12, isActive: true },
    { id: 'c4', name: 'Grocery', slug: 'grocery', image: '/images/category/grocery.png', icon: '🛒', itemCount: 45, isActive: true },
    { id: 'c5', name: 'Sauces & Condiments', slug: 'sauces-condiments', image: '/images/category/sauces.png', icon: '🫙', itemCount: 15, isActive: true },
    { id: 'c6', name: 'Oils', slug: 'oils', image: '/images/category/oils.png', icon: '🫒', itemCount: 8, isActive: true },
    { id: 'c7', name: 'Spices & Masalas', slug: 'spices-masalas', image: '/images/category/spices.png', icon: '🌶️', itemCount: 22, isActive: true },
    { id: 'c8', name: 'Bakery Ingredients', slug: 'bakery-ingredients', image: '/images/category/bakery.png', icon: '🍰', itemCount: 14, isActive: true },
    { id: 'c9', name: 'Grains & Flour', slug: 'grains-flour', image: '/images/category/grains.png', icon: '🌾', itemCount: 10, isActive: true },
    { id: 'c10', name: 'Beverages', slug: 'beverages', image: '/images/category/beverages.png', icon: '🧃', itemCount: 8, isActive: true },
];

// ---- ORDER LISTS ----

export const MOCK_ORDER_LISTS: OrderList[] = [
    {
        id: 'ol1',
        name: 'Daily Kitchen Supplies',
        userId: 'u1',
        vendorId: 'v6',
        vendorName: 'Bakers Hub',
        vendorLogo: '/images/top vendors/39a5dd37096e44eb8b72e053055e32896d63c44a.png',
        items: [
            { productId: 'p22', product: MOCK_VENDOR_PRODUCTS.v6[0], defaultQty: 5, lastOrderedQty: 5 },
            { productId: 'p23', product: MOCK_VENDOR_PRODUCTS.v6[1], defaultQty: 2, lastOrderedQty: 2 },
        ],
        createdAt: new Date('2026-02-15'),
        updatedAt: new Date('2026-03-10'),
        lastUsed: new Date('2026-03-10'),
    },
    {
        id: 'ol2',
        name: 'Weekly Grocery',
        userId: 'u1',
        vendorId: 'v4',
        vendorName: 'Gokul Dairy',
        vendorLogo: '/images/top vendors/groceri.png',
        items: [
            { productId: 'p17', product: MOCK_VENDOR_PRODUCTS.v4[0], defaultQty: 3, lastOrderedQty: 3 },
            { productId: 'p18', product: MOCK_VENDOR_PRODUCTS.v4[1], defaultQty: 5, lastOrderedQty: 5 },
        ],
        createdAt: new Date('2026-02-20'),
        updatedAt: new Date('2026-03-08'),
        lastUsed: new Date('2026-03-08'),
    },
    {
        id: 'ol3',
        name: 'Inventory Restock',
        userId: 'u1',
        vendorId: 'v1',
        vendorName: 'Sharad Dairy',
        vendorLogo: '/images/top vendors/emarket.png',
        items: [
            { productId: 'p1', product: MOCK_VENDOR_PRODUCTS.v1[0], defaultQty: 10, lastOrderedQty: 10 },
            { productId: 'p2', product: MOCK_VENDOR_PRODUCTS.v1[1], defaultQty: 5, lastOrderedQty: 5 },
        ],
        createdAt: new Date('2026-03-01'),
        updatedAt: new Date('2026-03-12'),
        lastUsed: new Date('2026-03-12'),
    },
];

// ---- PAST ORDERS ----

export const MOCK_PAST_ORDERS: PurchaseOrder[] = [
    {
        id: 'PO-2026-001',
        vendorId: 'v1',
        vendorName: 'Sharad Dairy',
        vendorLogo: '/images/top vendors/vendor-logo1.png',
        userId: 'u1',
        items: [
            { productId: 'p1', name: 'Amul Butter', packSize: '1 kg', price: 420, quantity: 2, total: 840 },
            { productId: 'p2', name: 'Amul Cheese Block', packSize: '1 kg', price: 380, quantity: 1, total: 380 },
            { productId: 'p3', name: 'Fresh Paneer', packSize: '1 kg', price: 320, quantity: 3, total: 960 },
        ],
        subtotal: 2180,
        tax: 0,
        deliveryCharge: 0,
        total: 2180,
        status: 'delivered',
        paymentMethod: 'credit',
        paymentStatus: 'paid',
        deliverySchedule: '10 Mar 2026, 7:00 AM',
        createdAt: new Date('2026-03-09'),
        updatedAt: new Date('2026-03-10'),
    },
    {
        id: 'PO-2026-002',
        vendorId: 'v2',
        vendorName: 'Metro Foods',
        vendorLogo: '/images/top vendors/vendor-logo2.png',
        userId: 'u1',
        items: [
            { productId: 'p7', name: 'Kissan Tomato Ketchup', packSize: '1 kg', price: 145, quantity: 3, total: 435 },
            { productId: 'p9', name: 'Basmati Rice', packSize: '10 kg', price: 1200, quantity: 2, total: 2400 },
        ],
        subtotal: 2835,
        tax: 0,
        deliveryCharge: 0,
        total: 2835,
        status: 'confirmed',
        paymentMethod: 'online',
        paymentStatus: 'paid',
        deliverySchedule: '12 Mar 2026, 6:00 AM',
        createdAt: new Date('2026-03-11'),
        updatedAt: new Date('2026-03-11'),
    },
];

// ---- COLLECTIONS ----

export const MOCK_COLLECTIONS = [
    { id: 'col1', name: 'Italian Kitchen', icon: '🇮🇹', description: 'Everything for pasta, pizza & more', slug: 'italian-kitchen', color: '#FEF3C7' },
    { id: 'col2', name: 'Oriental Kitchen', icon: '🥢', description: 'Wok-ready sauces, noodles & spices', slug: 'oriental-kitchen', color: '#FEE2E2' },
    { id: 'col3', name: 'Ready to Cook', icon: '⚡', description: 'Pre-made mixes & instant items', slug: 'ready-to-cook', color: '#DBEAFE' },
    { id: 'col4', name: 'Heavy Discounts', icon: '🏷️', description: 'Best wholesale deals this week', slug: 'heavy-discounts', color: '#D1FAE5' },
    { id: 'col5', name: 'Bakery Essentials', icon: '🧁', description: 'Flour, chocolate, cream & more', slug: 'bakery-essentials', color: '#FCE7F3' },
    { id: 'col6', name: 'Tandoor & Grill', icon: '🔥', description: 'Marinades, charcoal & tandoor items', slug: 'tandoor-grill', color: '#FED7AA' },
];
