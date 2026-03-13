// ─── Horeca1 Vendor Marketplace Data ─────────────────────────────────────────
// Flow: Search >> Vendor >> Vendor Catalog >> Order (Swiggy Model)
// Customers buy FROM vendors, not from a universal product pool.

export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  unit: string;
  inStock: boolean;
  discount?: number;
}

export interface VendorCategory {
  id: string;
  name: string;
  image: string;
  products: Product[];
}

export interface Vendor {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  categories: string[]; // short summary tags
  rating: number;
  deliveryTime: string;
  minOrder: number;
  acceptsCredit: boolean;
  isOpen: boolean;
  catalog: VendorCategory[];
}

export interface GlobalCategory {
  id: string;
  name: string;
  image: string;
}

// ─── 19 Global Categories ────────────────────────────────────────────────────

export const globalCategories: GlobalCategory[] = [
  { id: 'fruits-vegetables', name: 'Fruits & Vegetables', image: '/images/category/vegitable.png' },
  { id: 'dairy', name: 'Dairy', image: '/images/category/milk.png' },
  { id: 'canned-imported', name: 'Canned & Imported', image: '/images/category/candy.png' },
  { id: 'flours', name: 'Flours', image: '/images/category/snacks.png' },
  { id: 'sauces-seasoning', name: 'Sauces & Seasoning', image: '/images/category/drink-juice.png' },
  { id: 'masala-salt-sugar', name: 'Masala, Salt & Sugar', image: '/images/masala-salt/masala-salt-logo.png' },
  { id: 'chicken-eggs', name: 'Chicken & Eggs', image: '/images/category/animal food.png' },
  { id: 'edible-oils', name: 'Edible Oils', image: '/images/edible-oil/ediable-oil-logo.png' },
  { id: 'custom-packaging', name: 'Custom Packaging', image: '/images/category/vegitable.png' },
  { id: 'frozen-instant', name: 'Frozen & Instant Food', image: '/images/category/frozen foods.png' },
  { id: 'packaging-material', name: 'Packaging Material', image: '/images/category/vegitable.png' },
  { id: 'bakery-chocolates', name: 'Bakery & Chocolates', image: '/images/category/candy.png' },
  { id: 'beverages-mixers', name: 'Beverages & Mixers', image: '/images/category/drink-juice.png' },
  { id: 'cleaning-consumables', name: 'Cleaning & Consumables', image: '/images/category/snacks.png' },
  { id: 'pulses', name: 'Pulses', image: '/images/category/snacks.png' },
  { id: 'mutton-duck-meat', name: 'Mutton, Duck & Meat', image: '/images/category/fish & meat.png' },
  { id: 'dry-fruits-nuts', name: 'Dry Fruits & Nuts', image: '/images/category/fruits.png' },
  { id: 'rice-products', name: 'Rice & Rice Products', image: '/images/category/snacks.png' },
  { id: 'fish-prawns-seafood', name: 'Fish, Prawns & Seafood', image: '/images/category/fish & meat.png' },
];

// ─── 10 Vendors with Catalog ─────────────────────────────────────────────────

export const vendors: Vendor[] = [
  // ── 1. Arisha Mart ──────────────────────────────────────────────────────
  {
    id: 'v6',
    name: 'Arisha Mart',
    logo: '/images/top vendors/39a5dd37096e44eb8b72e053055e32896d63c44a.png',
    tagline: 'Fresh grocery delivered daily',
    categories: ['grocery'],
    rating: 4.6,
    deliveryTime: '24 hrs',
    minOrder: 500,
    acceptsCredit: true,
    isOpen: true,
    catalog: [
      {
        id: 'dairy',
        name: 'Dairy',
        image: '/images/category/milk.png',
        products: [
          { id: 'sd-1', name: 'Amul Gold Full Cream Milk 1L', image: '/images/dairy/amul-butter.png', price: 72, originalPrice: 78, unit: '1 L', inStock: true, discount: 8 },
          { id: 'sd-2', name: 'Mother Dairy Toned Milk 500ml', image: '/images/dairy/amul-cheese.png', price: 30, originalPrice: 32, unit: '500 ml', inStock: true },
        ],
      },
    ],
  },

  // ── 2. Mentari Mart ─────────────────────────────────────────────────────
  {
    id: 'v7',
    name: 'Mentari Mart',
    logo: '/images/top vendors/658b597eb627e280b99c0cf10e482793 2.png',
    tagline: 'Grocery & Vegetables marketplace',
    categories: ['Grocery', 'Vegetables'],
    rating: 4.3,
    deliveryTime: '18 hrs',
    minOrder: 1000,
    acceptsCredit: true,
    isOpen: true,
    catalog: [
      {
        id: 'pulses',
        name: 'Pulses',
        image: '/images/category/snacks.png',
        products: [
          { id: 'mf-1', name: 'Toor Dal 1kg', image: '/images/organic/product-img20.png', price: 155, originalPrice: 180, unit: '1 kg', inStock: true, discount: 14 },
        ],
      },
    ],
  },

  // ── 3. Borcelle ─────────────────────────────────────────────────────────
  {
    id: 'v5',
    name: 'Borcelle',
    logo: '/images/top vendors/961d17c25868145dd167df9f88ca0d40a7c057d1.png',
    tagline: 'Organic and dry fruits specialists',
    categories: ['Grocery', 'Dry Fruits'],
    rating: 4.8,
    deliveryTime: '6 hrs',
    minOrder: 300,
    acceptsCredit: false,
    isOpen: true,
    catalog: [
      {
        id: 'fruits-vegetables',
        name: 'Fruits & Vegetables',
        image: '/images/category/vegitable.png',
        products: [
          { id: 'fh-1', name: 'Fresh Tomato 1kg', image: '/images/product/product-img3.png', price: 35, originalPrice: 50, unit: '1 kg', inStock: true, discount: 30 },
        ],
      },
    ],
  },

  // 4. Walmart ────────────────────────────────────────────────────────
  {
    id: 'v8',
    name: 'Walmart',
    logo: '/images/top vendors/ecommerce-logo-template_658705-117 3.png',
    tagline: 'Grocery, Electronics and more',
    categories: ['Grocery', 'Electronic', '3+'],
    rating: 4.5,
    deliveryTime: '20 hrs',
    minOrder: 400,
    acceptsCredit: true,
    isOpen: true,
    catalog: [
      {
        id: 'dairy',
        name: 'Dairy',
        image: '/images/category/milk.png',
        products: [
          { id: 'gd-6', name: 'Fresh Bread Loaf 400g', image: '/images/daily-best-sell/best-sell1.png', price: 40, originalPrice: 45, unit: '400 g', inStock: true },
          { id: 'gd-7', name: 'Pav 8pcs', image: '/images/daily-best-sell/best-sell2.png', price: 30, originalPrice: 35, unit: '8 pcs', inStock: true },
          { id: 'gd-8', name: 'Butter Cookies Pack', image: '/images/daily-best-sell/best-sell3.png', price: 85, originalPrice: 100, unit: '200 g', inStock: true, discount: 15 },
        ],
      },
    ],
  },

  // ── 5. Allure Mart ──────────────────────────────────────────────────────
  {
    id: 'v9',
    name: 'Allure Mart',
    logo: '/images/top vendors/da025fadd66fb2aef4d63f0db58b86b5 2.png',
    tagline: 'Premium grocery and beauty products',
    categories: ['Grocery', 'Fruits'],
    rating: 4.4,
    deliveryTime: '24 hrs',
    minOrder: 750,
    acceptsCredit: false,
    isOpen: true,
    catalog: [
      {
        id: 'masala-salt-sugar',
        name: 'Masala, Salt & Sugar',
        image: '/images/masala-salt/masala-salt-logo.png',
        products: [
          { id: 'sk-1', name: 'Everest Turmeric Powder 200g', image: '/images/masala-salt/everest-masala.png', price: 55, originalPrice: 65, unit: '200 g', inStock: true, discount: 15 },
        ],
      },
    ],
  },

  // ── 6. Cartomart ───────────────────────────────────────────────────────
  {
    id: 'v10',
    name: 'Cartomart',
    logo: '/images/top vendors/m-mart-grocery-store-brands-logo-238132857 3.png',
    tagline: 'Grocery and dry fruits center',
    categories: ['Grocery', 'Dry Fruits'],
    rating: 4.7,
    deliveryTime: '22 hrs',
    minOrder: 600,
    acceptsCredit: true,
    isOpen: true,
    catalog: [
      {
        id: 'bakery-chocolates',
        name: 'Bakery & Chocolates',
        image: '/images/category/candy.png',
        products: [
          { id: 'bh-1', name: 'Chocolate Compound 500g', image: '/images/daily-best-sell/best-sell3.png', price: 165, originalPrice: 195, unit: '500 g', inStock: true, discount: 15 },
        ],
      },
    ],
  },

  // ── 7. emarket ───────────────────────────────────────────────────────────
  {
    id: 'v1',
    name: 'emarket',
    logo: '/images/top vendors/emarket.png',
    tagline: 'Your everyday grocery and household needs',
    categories: ['Grocery', 'Vegetable', 'Cleaning', 'Packaging'],
    rating: 4.1,
    deliveryTime: '12 hrs',
    minOrder: 250,
    acceptsCredit: false,
    isOpen: true,
    catalog: [
      {
        id: 'fruits-vegetables',
        name: 'Fruits & Vegetables',
        image: '/images/category/vegitable.png',
        products: [
          { id: 'em-1', name: 'Mixed Vegetable Pack 1kg', image: '/images/category/vegitable.png', price: 65, originalPrice: 80, unit: '1 kg', inStock: true, discount: 19 },
          { id: 'em-2', name: 'Carrot 500g', image: '/images/organic/product-img20.png', price: 22, originalPrice: 28, unit: '500 g', inStock: true },
          { id: 'em-3', name: 'Beetroot 500g', image: '/images/organic/product-img21.png', price: 25, originalPrice: 32, unit: '500 g', inStock: true, discount: 22 },
          { id: 'em-4', name: 'Cucumber 500g', image: '/images/organic/product-img22.png', price: 18, originalPrice: 25, unit: '500 g', inStock: true },
        ],
      },
      {
        id: 'cleaning-consumables',
        name: 'Cleaning & Consumables',
        image: '/images/category/snacks.png',
        products: [
          { id: 'em-5', name: 'Vim Dishwash Bar 500g', image: '/images/product/product-img1.png', price: 42, originalPrice: 48, unit: '500 g', inStock: true },
          { id: 'em-6', name: 'Harpic Toilet Cleaner 500ml', image: '/images/product/product-img5.png', price: 92, originalPrice: 105, unit: '500 ml', inStock: true, discount: 12 },
          { id: 'em-7', name: 'Lizol Floor Cleaner 1L', image: '/images/product/product-img6.png', price: 145, originalPrice: 168, unit: '1 L', inStock: true, discount: 14 },
          { id: 'em-8', name: 'Scotch Brite Scrub Pad 3pcs', image: '/images/product/product-img3.png', price: 65, originalPrice: 75, unit: '3 pcs', inStock: true },
          { id: 'em-9', name: 'Surf Excel Quick Wash 1kg', image: '/images/product/product-img1.png', price: 110, originalPrice: 130, unit: '1 kg', inStock: true, discount: 15 },
        ],
      },
      {
        id: 'packaging-material',
        name: 'Packaging Material',
        image: '/images/category/vegitable.png',
        products: [
          { id: 'em-10', name: 'Aluminium Foil Roll 72m', image: '/images/product/product-img5.png', price: 250, originalPrice: 290, unit: '72 m', inStock: true, discount: 14 },
          { id: 'em-11', name: 'Cling Wrap 100m', image: '/images/product/product-img6.png', price: 185, originalPrice: 210, unit: '100 m', inStock: true },
          { id: 'em-12', name: 'Paper Bags Brown 100pcs', image: '/images/product/product-img1.png', price: 120, originalPrice: 145, unit: '100 pcs', inStock: true, discount: 17 },
        ],
      },
    ],
  },

  // ── 8. Whole Foods Market ────────────────────────────────────────────────
  {
    id: 'v2',
    name: 'Whole Food Market',
    logo: '/images/top vendors/whole-foods-market.png',
    tagline: 'Organic and whole grain superstore',
    categories: ['Grocery', 'Fruits', 'Organic', 'Vegetables'],
    rating: 4.6,
    deliveryTime: '14 hrs',
    minOrder: 500,
    acceptsCredit: true,
    isOpen: true,
    catalog: [
      {
        id: 'fruits-vegetables',
        name: 'Fruits & Vegetables',
        image: '/images/category/vegitable.png',
        products: [
          { id: 'wf-1', name: 'Organic Spinach 200g', image: '/images/fruits-vegetables/corriander.png', price: 35, originalPrice: 45, unit: '200 g', inStock: true, discount: 22 },
          { id: 'wf-2', name: 'Avocado 2pcs', image: '/images/category/fruits.png', price: 180, originalPrice: 220, unit: '2 pcs', inStock: true, discount: 18 },
          { id: 'wf-3', name: 'Kiwi 3pcs', image: '/images/category/fruits.png', price: 120, originalPrice: 150, unit: '3 pcs', inStock: true, discount: 20 },
          { id: 'wf-4', name: 'Cherry Tomatoes 200g', image: '/images/product/product-img3.png', price: 55, originalPrice: 70, unit: '200 g', inStock: true },
          { id: 'wf-5', name: 'Organic Ginger 100g', image: '/images/organic/product-img23.png', price: 28, originalPrice: 35, unit: '100 g', inStock: true },
        ],
      },
      {
        id: 'pulses',
        name: 'Pulses',
        image: '/images/category/snacks.png',
        products: [
          { id: 'wf-6', name: 'Organic Toor Dal 1kg', image: '/images/organic/product-img20.png', price: 195, originalPrice: 230, unit: '1 kg', inStock: true, discount: 15 },
          { id: 'wf-7', name: 'Organic Moong Whole 500g', image: '/images/organic/product-img21.png', price: 110, originalPrice: 130, unit: '500 g', inStock: true },
        ],
      },
      {
        id: 'dry-fruits-nuts',
        name: 'Dry Fruits & Nuts',
        image: '/images/category/fruits.png',
        products: [
          { id: 'wf-8', name: 'Mixed Nuts Trail Pack 250g', image: '/images/organic/product-img25.png', price: 320, originalPrice: 380, unit: '250 g', inStock: true, discount: 16 },
          { id: 'wf-9', name: 'Organic Dates 500g', image: '/images/organic/product-img22.png', price: 175, originalPrice: 210, unit: '500 g', inStock: true },
          { id: 'wf-10', name: 'Chia Seeds 200g', image: '/images/organic/product-img24.png', price: 195, originalPrice: 240, unit: '200 g', inStock: true, discount: 19 },
        ],
      },
      {
        id: 'rice-products',
        name: 'Rice & Rice Products',
        image: '/images/category/snacks.png',
        products: [
          { id: 'wf-11', name: 'Organic Brown Rice 1kg', image: '/images/organic/product-img25.png', price: 165, originalPrice: 195, unit: '1 kg', inStock: true, discount: 15 },
          { id: 'wf-12', name: 'Quinoa White 500g', image: '/images/organic/product-img20.png', price: 280, originalPrice: 340, unit: '500 g', inStock: true, discount: 18 },
        ],
      },
    ],
  },

  // ── 9. M Mart ────────────────────────────────────────────────────────────
  {
    id: 'v3',
    name: 'M Mart',
    logo: '/images/top vendors/m-mart.png',
    tagline: 'Imported, frozen, and ready-to-eat specialists',
    categories: ['Grocery', 'Dry Fruits', 'Imported', 'Frozen'],
    rating: 4.2,
    deliveryTime: '16 hrs',
    minOrder: 800,
    acceptsCredit: false,
    isOpen: true,
    catalog: [
      {
        id: 'canned-imported',
        name: 'Canned & Imported',
        image: '/images/category/candy.png',
        products: [
          { id: 'mm-1', name: 'Del Monte Pineapple Slices 450g', image: '/images/daily-best-sell/best-sell1.png', price: 145, originalPrice: 170, unit: '450 g', inStock: true, discount: 15 },
          { id: 'mm-2', name: 'Heinz Baked Beans 415g', image: '/images/daily-best-sell/best-sell2.png', price: 195, originalPrice: 230, unit: '415 g', inStock: true, discount: 15 },
          { id: 'mm-3', name: 'Nutella Hazelnut Spread 350g', image: '/images/daily-best-sell/best-sell3.png', price: 410, originalPrice: 480, unit: '350 g', inStock: true, discount: 15 },
          { id: 'mm-4', name: 'Pringles Original 107g', image: '/images/daily-best-sell/best-sell4.png', price: 149, originalPrice: 170, unit: '107 g', inStock: true, discount: 12 },
          { id: 'mm-5', name: 'Tabasco Pepper Sauce 60ml', image: '/images/product/product-img5.png', price: 185, originalPrice: 220, unit: '60 ml', inStock: true },
        ],
      },
      {
        id: 'frozen-instant',
        name: 'Frozen & Instant Food',
        image: '/images/category/frozen foods.png',
        products: [
          { id: 'mm-6', name: 'McCain French Fries 750g', image: '/images/category/frozen foods.png', price: 185, originalPrice: 215, unit: '750 g', inStock: true, discount: 14 },
          { id: 'mm-7', name: 'ITC Aashirvaad Parathas 5pcs', image: '/images/product/product-img6.png', price: 110, originalPrice: 130, unit: '5 pcs', inStock: true, discount: 15 },
          { id: 'mm-8', name: 'Maggi 2-Minute Noodles 12 pack', image: '/images/product/product-img1.png', price: 156, originalPrice: 180, unit: '12 pcs', inStock: true, discount: 13 },
          { id: 'mm-9', name: 'Yippee Noodles 6 pack', image: '/images/product/product-img3.png', price: 90, originalPrice: 102, unit: '6 pcs', inStock: true },
          { id: 'mm-10', name: 'Frozen Sweet Corn 500g', image: '/images/category/frozen foods.png', price: 75, originalPrice: 90, unit: '500 g', inStock: true },
        ],
      },
      {
        id: 'beverages-mixers',
        name: 'Beverages & Mixers',
        image: '/images/category/drink-juice.png',
        products: [
          { id: 'mm-11', name: 'Tropicana Orange 1L', image: '/images/category/drink-juice.png', price: 110, originalPrice: 130, unit: '1 L', inStock: true, discount: 15 },
          { id: 'mm-12', name: 'Real Mango Juice 1L', image: '/images/category/drink-juice.png', price: 99, originalPrice: 115, unit: '1 L', inStock: true },
          { id: 'mm-13', name: 'Coca Cola 1.25L', image: '/images/category/drink-juice.png', price: 72, originalPrice: 80, unit: '1.25 L', inStock: true },
          { id: 'mm-14', name: 'Red Bull Energy 250ml', image: '/images/category/drink-juice.png', price: 115, originalPrice: 125, unit: '250 ml', inStock: true },
        ],
      },
      {
        id: 'sauces-seasoning',
        name: 'Sauces & Seasoning',
        image: '/images/category/drink-juice.png',
        products: [
          { id: 'mm-15', name: 'Hellmann\'s Mayonnaise 400g', image: '/images/product/product-img5.png', price: 225, originalPrice: 260, unit: '400 g', inStock: true, discount: 13 },
          { id: 'mm-16', name: 'Sriracha Hot Chilli Sauce 480g', image: '/images/product/product-img6.png', price: 295, originalPrice: 340, unit: '480 g', inStock: true, discount: 13 },
        ],
      },
    ],
  },

  // ── 10. Groceri ──────────────────────────────────────────────────────────
  {
    id: 'v4',
    name: 'Groceri',
    logo: '/images/top vendors/groceri.png',
    tagline: 'Complete grocery and daily essentials',
    categories: ['Grocery', 'Fruits', 'Dairy', 'Cleaning'],
    rating: 4.0,
    deliveryTime: '10 hrs',
    minOrder: 200,
    acceptsCredit: true,
    isOpen: true,
    catalog: [
      {
        id: 'fruits-vegetables',
        name: 'Fruits & Vegetables',
        image: '/images/category/vegitable.png',
        products: [
          { id: 'gr-1', name: 'Fresh Cauliflower 1pc', image: '/images/category/vegitable.png', price: 30, originalPrice: 38, unit: '1 pc', inStock: true },
          { id: 'gr-2', name: 'French Beans 250g', image: '/images/organic/product-img22.png', price: 28, originalPrice: 35, unit: '250 g', inStock: true, discount: 20 },
          { id: 'gr-3', name: 'Green Peas 250g', image: '/images/organic/product-img23.png', price: 35, originalPrice: 42, unit: '250 g', inStock: true },
          { id: 'gr-4', name: 'Apple Shimla 1kg', image: '/images/category/fruits.png', price: 180, originalPrice: 220, unit: '1 kg', inStock: true, discount: 18 },
          { id: 'gr-5', name: 'Pomegranate 500g', image: '/images/category/fruits.png', price: 120, originalPrice: 145, unit: '500 g', inStock: true },
        ],
      },
      {
        id: 'dairy',
        name: 'Dairy',
        image: '/images/category/milk.png',
        products: [
          { id: 'gr-6', name: 'Nestle Milk 1L', image: '/images/dairy/amul-butter.png', price: 72, originalPrice: 80, unit: '1 L', inStock: true },
          { id: 'gr-7', name: 'Amul Processed Cheese 200g', image: '/images/dairy/amul-cheese.png', price: 105, originalPrice: 120, unit: '200 g', inStock: true, discount: 12 },
          { id: 'gr-8', name: 'Greek Yogurt Plain 100g', image: '/images/dairy/dairy-logo.png', price: 45, originalPrice: 55, unit: '100 g', inStock: true },
        ],
      },
      {
        id: 'pulses',
        name: 'Pulses',
        image: '/images/category/snacks.png',
        products: [
          { id: 'gr-9', name: 'Rajma Chitra 500g', image: '/images/organic/product-img20.png', price: 85, originalPrice: 100, unit: '500 g', inStock: true, discount: 15 },
          { id: 'gr-10', name: 'Kabuli Chana 500g', image: '/images/organic/product-img21.png', price: 78, originalPrice: 90, unit: '500 g', inStock: true },
        ],
      },
      {
        id: 'cleaning-consumables',
        name: 'Cleaning & Consumables',
        image: '/images/category/snacks.png',
        products: [
          { id: 'gr-11', name: 'Colin Glass Cleaner 500ml', image: '/images/product/product-img5.png', price: 95, originalPrice: 110, unit: '500 ml', inStock: true, discount: 14 },
          { id: 'gr-12', name: 'Garbage Bags 30pcs', image: '/images/product/product-img6.png', price: 48, originalPrice: 55, unit: '30 pcs', inStock: true },
          { id: 'gr-13', name: 'Tissue Roll 4pcs', image: '/images/product/product-img1.png', price: 120, originalPrice: 140, unit: '4 pcs', inStock: true },
        ],
      },
    ],
  },
];

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Get all vendors that sell products in a given category */
export function getVendorsByCategory(categoryId: string): Vendor[] {
  return vendors.filter(v =>
    v.catalog.some(c => c.id === categoryId)
  );
}

/** Get a specific vendor by ID */
export function getVendorById(vendorId: string): Vendor | undefined {
  return vendors.find(v => v.id === vendorId);
}

/** Get a vendor's catalog for a specific category */
export function getVendorCategoryProducts(vendorId: string, categoryId: string): Product[] {
  const vendor = getVendorById(vendorId);
  if (!vendor) return [];
  const cat = vendor.catalog.find(c => c.id === categoryId);
  return cat?.products || [];
}

/** Get all products across all vendors for a category (with vendor info) */
export function getAllProductsInCategory(categoryId: string): { product: Product; vendor: Vendor }[] {
  const results: { product: Product; vendor: Vendor }[] = [];
  vendors.forEach(v => {
    const cat = v.catalog.find(c => c.id === categoryId);
    if (cat) {
      cat.products.forEach(p => {
        results.push({ product: p, vendor: v });
      });
    }
  });
  return results;
}

/** Search vendors by name or category tags */
export function searchVendors(query: string): Vendor[] {
  const q = query.toLowerCase();
  return vendors.filter(v =>
    v.name.toLowerCase().includes(q) ||
    v.categories.some(c => c.toLowerCase().includes(q)) ||
    v.tagline.toLowerCase().includes(q)
  );
}

/** Search products across all vendors */
export function searchProducts(query: string): { product: Product; vendor: Vendor; categoryName: string }[] {
  const q = query.toLowerCase();
  const results: { product: Product; vendor: Vendor; categoryName: string }[] = [];
  vendors.forEach(v => {
    v.catalog.forEach(cat => {
      cat.products.forEach(p => {
        if (p.name.toLowerCase().includes(q)) {
          results.push({ product: p, vendor: v, categoryName: cat.name });
        }
      });
    });
  });
  return results;
}

/** Get a flat list of all unique category IDs served by all vendors */
export function getActiveCategories(): GlobalCategory[] {
  const activeIds = new Set<string>();
  vendors.forEach(v => {
    v.catalog.forEach(c => activeIds.add(c.id));
  });
  return globalCategories.filter(gc => activeIds.has(gc.id));
}

/** Get "featured" or "top-rated" vendors */
export function getTopVendors(count = 4): Vendor[] {
  return [...vendors].sort((a, b) => b.rating - a.rating).slice(0, count);
}

/** Get best deals across all vendors */
export function getBestDeals(count = 8): { product: Product; vendor: Vendor }[] {
  const all: { product: Product; vendor: Vendor; discount: number }[] = [];
  vendors.forEach(v => {
    v.catalog.forEach(cat => {
      cat.products.forEach(p => {
        if (p.discount && p.inStock) {
          all.push({ product: p, vendor: v, discount: p.discount });
        }
      });
    });
  });
  return all.sort((a, b) => b.discount - a.discount).slice(0, count);
}
