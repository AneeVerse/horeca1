'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Heart,
    ChevronDown,
    ChevronUp,
    Plus,
    ShoppingCart,
    Search,
    X,
    Share2
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PromotionBanners } from '@/components/features/PromotionBanners';
import { DeliveryPoster } from '@/components/features/DeliveryPoster';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { toast } from 'sonner';
import { MOCK_VENDORS } from '@/lib/mockData';
import { vendors as vendorDataVendors } from '@/data/vendorData';
import type { VendorProduct } from '@/types';

// --- Types ---
interface Vendor {
    id: number;
    name: string;
    price: string;
    stock: number;
    minQty: number;
}

interface Product {
    id: number;
    name: string;
    category: string;
    image: string;
    description: string;
    vendors: Vendor[];
    sideBanner?: string;
    weight?: string;
    price?: number;
}

interface SimilarProduct {
    id: number;
    name: string;
    image: string;
    vendorCount: number;
}

// --- Mock Data ---
const PRODUCTS_DATA: Record<string, Product> = {
    '1': {
        id: 1,
        name: 'Kissan Fresh Tomato ketchup 2kg',
        category: 'Masala, Oils & Ghee',
        image: '/images/product/product-img1.png',
        description: 'Rich and tangy tomato ketchup made from fresh tomatoes. Perfect for adding flavor to your favorite snacks and meals. Contains no artificial preservatives.',
        vendors: [
            { id: 1, name: 'G-Mart', price: '₹188/pc', stock: 74, minQty: 12 },
            { id: 2, name: 'Family Supermarket', price: '₹188/pc', stock: 20, minQty: 5 },
            { id: 3, name: 'Bee Mart', price: '₹188/pc', stock: 50, minQty: 10 },
        ],
        sideBanner: 'Ketchup',
        weight: '2 kg'
    },
    // Fruits & Vegetables (from ProductCategories)
    '1001': {
        id: 1001, name: 'Onion 1 kg', category: 'Vegetables', image: '/images/fruits-vegetables/onion.png', description: 'Fresh onions.',
        vendors: [
            { id: 1, name: 'G-Mart', price: '₹35/kg', stock: 100, minQty: 1 },
            { id: 2, name: 'Family Supermarket', price: '₹38/kg', stock: 40, minQty: 2 },
            { id: 3, name: 'Bee Mart', price: '₹34/kg', stock: 60, minQty: 1 },
        ], sideBanner: 'Onion', weight: '1 kg'
    },
    '1002': {
        id: 1002, name: 'Coriander 200 gms Bunch', category: 'Vegetables', image: '/images/fruits-vegetables/corriander.png', description: 'Fresh coriander.',
        vendors: [
            { id: 1, name: 'G-Mart', price: '₹15/pc', stock: 30, minQty: 1 },
            { id: 2, name: 'Family Supermarket', price: '₹18/pc', stock: 15, minQty: 1 },
            { id: 3, name: 'Bee Mart', price: '₹14/pc', stock: 20, minQty: 1 },
        ], sideBanner: 'Herb', weight: '200 g'
    },

    // Dairy (from ProductCategories)
    '1003': {
        id: 1003, name: 'Amul Butter 100 gms', category: 'Dairy', image: '/images/dairy/amul-butter.png', description: 'Amul Butter.',
        vendors: [
            { id: 1, name: 'G-Mart', price: '₹55/pc', stock: 80, minQty: 1 },
            { id: 2, name: 'Family Supermarket', price: '₹58/pc', stock: 30, minQty: 1 },
            { id: 3, name: 'Bee Mart', price: '₹55/pc', stock: 45, minQty: 1 },
        ], sideBanner: 'Butter', weight: '100 g'
    },
    '1004': {
        id: 1004, name: 'Amul Cheese Block 400 gms', category: 'Dairy', image: '/images/dairy/amul-cheese.png', description: 'Amul Cheese.',
        vendors: [
            { id: 1, name: 'G-Mart', price: '₹320/pc', stock: 40, minQty: 1 },
            { id: 2, name: 'Family Supermarket', price: '₹335/pc', stock: 20, minQty: 1 },
            { id: 3, name: 'Bee Mart', price: '₹315/pc', stock: 25, minQty: 1 },
        ], sideBanner: 'Cheese', weight: '400 g'
    },

    // Edible Oil (from RecommendedCategories)
    '2001': {
        id: 2001, name: 'Safoola Gold Oil - 1 L', category: 'Edible Oil', image: '/images/edible-oil/saffola-gold-oil.png', description: 'Saffola Gold Oil.',
        vendors: [
            { id: 1, name: 'G-Mart', price: '₹195/L', stock: 200, minQty: 1 },
            { id: 2, name: 'Family Supermarket', price: '₹205/L', stock: 100, minQty: 1 },
            { id: 3, name: 'Bee Mart', price: '₹190/L', stock: 80, minQty: 1 },
        ], sideBanner: 'Oil', weight: '1 L'
    },
    '2002': {
        id: 2002, name: 'Gemini Refined Sunflower Oil - 5 L', category: 'Edible Oil', image: '/images/edible-oil/gemini.png', description: 'Gemini Oil.',
        vendors: [
            { id: 1, name: 'G-Mart', price: '₹680/can', stock: 150, minQty: 1 },
            { id: 2, name: 'Family Supermarket', price: '₹710/can', stock: 60, minQty: 1 },
            { id: 3, name: 'Bee Mart', price: '₹675/can', stock: 50, minQty: 1 },
        ], sideBanner: 'Oil', weight: '5 L'
    },

    // Masala & Salt (from RecommendedCategories)
    '2003': {
        id: 2003, name: 'Everest Meat Masala - 50 gms Box', category: 'Masala & Salt', image: '/images/masala-salt/everest-masala.png', description: 'Everest Masala.',
        vendors: [
            { id: 1, name: 'G-Mart', price: '₹45/box', stock: 300, minQty: 1 },
            { id: 2, name: 'Family Supermarket', price: '₹48/box', stock: 150, minQty: 2 },
            { id: 3, name: 'Bee Mart', price: '₹44/box', stock: 200, minQty: 1 },
        ], sideBanner: 'Masala', weight: '50 g'
    },
    '2004': {
        id: 2004,
        name: 'TATA Salt - 1 kg',
        category: 'Masala & Salt',
        image: '/images/masala-salt/tata-salt.png',
        description: 'Tata Salt.',
        vendors: [
            { id: 1, name: 'G-Mart', price: '₹28/kg', stock: 74, minQty: 12 },
            { id: 2, name: 'Family Supermarket', price: '₹32/kg', stock: 20, minQty: 5 },
            { id: 3, name: 'Bee Mart', price: '₹30/kg', stock: 50, minQty: 10 },
        ],
        sideBanner: 'Salt',
        weight: '1 kg'
    },

    // Vegetable Page Items (from CategoryPage)
    '3001': { id: 3001, name: 'Ladies Finger 1 kg', category: 'Vegetables', image: '/images/product/product-img1.png', description: 'Fresh Okra (Bhindi).', vendors: [{ id: 1, name: 'G-Mart', price: '₹40/kg', stock: 50, minQty: 1 }], sideBanner: 'Veggie', weight: '1 kg' },
    '3002': { id: 3002, name: 'Desi Fresh Tomato 1 kg', category: 'Vegetables', image: '/images/product/product-img3.png', description: 'Fresh Tomatoes.', vendors: [{ id: 1, name: 'G-Mart', price: '₹22/kg', stock: 100, minQty: 1 }], sideBanner: 'Tomato', weight: '1 kg' },
    '3003': { id: 3003, name: 'Onion 1 kg', category: 'Vegetables', image: '/images/fruits-vegetables/onion.png', description: 'Fresh Onions.', vendors: [{ id: 1, name: 'G-Mart', price: '₹35/kg', stock: 100, minQty: 1 }], sideBanner: 'Onion', weight: '1 kg' },
    '3004': { id: 3004, name: 'Coriander 200 gms Bunch', category: 'Vegetables', image: '/images/fruits-vegetables/corriander.png', description: 'Fresh Coriander.', vendors: [{ id: 1, name: 'G-Mart', price: '₹15/pc', stock: 30, minQty: 1 }], sideBanner: 'Herb', weight: '200 g' },
    '3005': { id: 3005, name: 'Fresh Carrots', category: 'Vegetables', image: '/images/product/product-img5.png', description: 'Sweet Carrots.', vendors: [{ id: 1, name: 'G-Mart', price: '₹45/kg', stock: 40, minQty: 1 }], sideBanner: 'Carrot', weight: '1 kg' },
    '3006': { id: 3006, name: 'Green Broccoli', category: 'Vegetables', image: '/images/product/brokali.png', description: 'Fresh Broccoli.', vendors: [{ id: 1, name: 'G-Mart', price: '₹95/pc', stock: 25, minQty: 1 }], sideBanner: 'Broccoli', weight: '500 g' },

    // Fruit Page Items (from CategoryPage)
    '4001': { id: 4001, name: 'Nagpur Oranges 1 kg', category: 'Fruits', image: '/images/category/fruits.png', description: 'Nagpur Oranges.', vendors: [{ id: 1, name: 'G-Mart', price: '₹80/kg', stock: 60, minQty: 1 }], sideBanner: 'Orange', weight: '1 kg' },
    '4002': { id: 4002, name: 'Kashmir Apple 1 kg', category: 'Fruits', image: '/images/recom-product/product-img10.png', description: 'Kashmir Apples.', vendors: [{ id: 1, name: 'G-Mart', price: '₹160/kg', stock: 40, minQty: 1 }], sideBanner: 'Apple', weight: '1 kg' },
    '4003': { id: 4003, name: 'Nagpur Oranges 1 kg', category: 'Fruits', image: '/images/category/fruits.png', description: 'Nagpur Oranges.', vendors: [{ id: 1, name: 'G-Mart', price: '₹80/kg', stock: 60, minQty: 1 }], sideBanner: 'Orange', weight: '1 kg' },
    '4004': { id: 4004, name: 'Kashmir Apple 1 kg', category: 'Fruits', image: '/images/recom-product/product-img10.png', description: 'Kashmir Apples.', vendors: [{ id: 1, name: 'G-Mart', price: '₹160/kg', stock: 40, minQty: 1 }], sideBanner: 'Apple', weight: '1 kg' },
    'default': {
        id: 0,
        name: 'Fresh Organic Product',
        category: 'Organic Store',
        image: '/images/product/product-img3.png',
        description: 'Premium quality organic product sourced directly from local farms. Guarantees fresh taste and maximum nutrition.',
        vendors: [
            { id: 1, name: 'Eco Mart', price: '₹149/pc', stock: 50, minQty: 1 },
        ],
        sideBanner: 'Fresh',
        weight: '1 kg'
    }
};

const SIMILAR_ITEMS_MOCK = [
    { id: 5001, name: 'Maggi Ketchup', image: '/images/product/product-img1.png', category: 'Masala, Oils & Ghee', vendorCount: 3 },
    { id: 5002, name: 'Heinz Ketchup', image: '/images/product/product-img1.png', category: 'Masala, Oils & Ghee', vendorCount: 5 },
    { id: 5003, name: 'Del Monte Ketchup', image: '/images/product/product-img1.png', category: 'Masala, Oils & Ghee', vendorCount: 2 },
    { id: 5004, name: 'Kissan Chotu', image: '/images/product/product-img1.png', category: 'Masala, Oils & Ghee', vendorCount: 4 },
];

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const searchParams = useSearchParams();
    
    // Get real data from search params
    const vendorName = searchParams.get('v') || 'emarket';
    const productName = searchParams.get('n') || 'Fresh Organic Product';
    const productPrice = searchParams.get('p') || '49';
    const productImage = searchParams.get('i') || '/images/product/product-img3.png';
    const productCategory = searchParams.get('c') || 'Organic Store';
    const productUnit = searchParams.get('u') || '1 kg';

    const product = useMemo(() => {
        const base = PRODUCTS_DATA[id] || PRODUCTS_DATA['default'];
        return {
            ...base,
            name: productName,
            price: parseFloat(productPrice) || base.price,
            image: productImage,
            category: productCategory,
            weight: productUnit
        };
    }, [id, productName, productPrice, productImage, productCategory, productUnit]);

    const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
    const { addToCart, groups, updateQuantity } = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();

    const vendorProductForContext: VendorProduct = useMemo(() => ({
        id: product.id.toString(),
        vendorId: product.vendors?.[0]?.id.toString() || '0',
        vendorName: vendorName,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price || 0,
        images: [product.image],
        packSize: product.weight || '1 kg',
        unit: product.weight || '1 kg',
        stock: product.vendors?.[0]?.stock || 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        bulkPrices: [
            { minQty: 3, price: 147 },
            { minQty: 5, price: 245 }
        ],
        creditBadge: false,
        minOrderQuantity: 1,
    }), [product, vendorName]);

    const isLiked = isInWishlist(vendorProductForContext.id);

    // Track recently viewed vendor for "Continue Ordering" section
    useEffect(() => {
        if (!vendorName) return;
        try {
            // Try to find vendor in both data sources to get real id/logo
            const fromMock = MOCK_VENDORS.find(v => v.name.toLowerCase() === vendorName.toLowerCase() || v.slug === vendorName.toLowerCase());
            const fromVendorData = vendorDataVendors.find(v => v.name.toLowerCase() === vendorName.toLowerCase() || v.slug === vendorName.toLowerCase());
            const matched = fromMock || fromVendorData;
            
            const vId = matched?.id || `product-vendor-${vendorName}`;
            const vName = matched?.name || vendorName;
            const vLogo = matched?.logo || '';

            const KEY = 'horeca_recently_viewed';
            const saved = localStorage.getItem(KEY);
            let entries: any[] = [];
            if (saved) entries = JSON.parse(saved);

            // Get existing entry to merge products
            const existing = entries.find((e: any) => e.vendorId === vId);
            const existingProducts = existing?.viewedProducts || [];

            // Build the current product entry
            const currentProduct = {
                id: product.id.toString(),
                name: productName,
                image: productImage,
                price: parseFloat(productPrice) || 0,
                unit: productUnit,
            };

            // Merge: put current product first, then existing (dedup by id)
            const seenIds = new Set<string>();
            const mergedProducts: any[] = [];
            [currentProduct, ...existingProducts].forEach((p: any) => {
                if (!seenIds.has(p.id)) {
                    seenIds.add(p.id);
                    mergedProducts.push(p);
                }
            });

            entries = entries.filter((e: any) => e.vendorId !== vId);
            entries.unshift({
                vendorId: vId,
                vendorName: vName,
                vendorLogo: vLogo,
                viewedProducts: mergedProducts.slice(0, 20),
                viewedAt: Date.now(),
            });
            if (entries.length > 20) entries = entries.slice(0, 20);
            localStorage.setItem(KEY, JSON.stringify(entries));
        } catch (e) {
            console.error('Failed to save recently viewed vendor:', e);
        }
    }, [vendorName, productName]);

    const handleAdd = (qty: number = 1) => {
        // Find if item already in cart to update quantity
        const vendorGroup = groups.find(g => g.vendorName === vendorName || g.vendorId === product.vendors?.[0]?.id.toString());
        const cartItem = vendorGroup?.items.find(i => i.productId === product.id.toString());
        const currentQty = cartItem?.quantity || 0;

        const vendorProduct: VendorProduct = {
            id: product.id.toString(),
            vendorId: product.vendors?.[0]?.id.toString() || '0',
            vendorName: vendorName,
            name: product.name,
            description: product.description,
            category: product.category,
            price: parseFloat(product.vendors?.[0]?.price.replace('₹', '').split('/')[0]) || 0,
            images: [product.image],
            packSize: product.weight || '1 kg',
            unit: product.weight || '1 kg',
            stock: product.vendors?.[0]?.stock || 10,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            bulkPrices: [
                { minQty: 3, price: 147 },
                { minQty: 5, price: 245 }
            ],
            creditBadge: false,
            minOrderQuantity: 1,
        };

        if (currentQty > 0) {
            updateQuantity(vendorProduct.id, currentQty + qty);
        } else {
            addToCart(vendorProduct, qty);
        }

        toast.success(`${product.name} added to cart!`, {
            description: `Quantity: ${currentQty + qty} ${product.weight || ''}`,
            duration: 2000,
        });
    };

    // Dynamic similar items based on category
    let similarItemsList = Object.values(PRODUCTS_DATA)
        .filter(p => p.id !== product.id && p.id !== 0) // Exclude current and default
        .filter(p => p.category === product.category)
        .slice(0, 4)
        .map(p => ({
            id: p.id,
            originalId: p.id,
            name: p.name,
            image: p.image,
            vendorCount: p.vendors.length
        }));

    // If current category has no other items, use fallback
    if (similarItemsList.length === 0) {
        similarItemsList = Object.values(PRODUCTS_DATA)
            .filter(p => p.id !== product.id && p.id !== 0)
            .slice(0, 4)
            .map(p => ({
                id: p.id,
                originalId: p.id,
                name: p.name,
                image: p.image,
                vendorCount: p.vendors.length
            }));
    }

    // "Spam" items if fewer than 4 to fill the carousel as requested
    const baseItems = [...similarItemsList];
    if (baseItems.length > 0) {
        while (similarItemsList.length < 4) {
            const nextBatch = baseItems.map(item => ({
                ...item,
                id: item.id + (Math.random() * 100000) // Ensure unique keys for identical items
            }));
            similarItemsList.push(...nextBatch);
        }
    }
    similarItemsList = similarItemsList.slice(0, 4);

    return (
        <div className="bg-[#FFFFFF] min-h-screen">
            {/* Top Green Bar (as seen in Figma) */}
            <div className="w-full h-[5px] bg-[#53B175] md:hidden" />

            {/* Header */}
            <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-[100] border-b border-gray-50">
                <button onClick={() => router.back()} className="p-1">
                    <ArrowLeft size={22} className="text-[#181725]" strokeWidth={2} />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 text-[18px] font-extrabold text-[#181725] tracking-tight whitespace-nowrap">
                    {vendorName}
                </div>
                <div className="w-8" />
            </header>

            {/* Mobile + Tablet View */}
            <div className="lg:hidden pb-10 bg-[#F8F9FB]/30">


                {/* Main Product Section - White Card */}
                <div className="mx-0 bg-white pt-2 pb-8 px-5 rounded-b-[30px] shadow-sm">
                    {/* Image Section */}
                    <div className="relative flex flex-col items-center pt-4">
                        <div className="w-[240px] h-[240px] flex items-center justify-center p-4">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Pagination Dots */}
                        <div className="flex gap-1.5 mt-4">
                            <div className="w-[18px] h-[6px] bg-[#7C7C7C] rounded-full" />
                            <div className="w-[6px] h-[6px] bg-[#E2E2E2] rounded-full" />
                            <div className="w-[6px] h-[6px] bg-[#E2E2E2] rounded-full" />
                            <div className="w-[6px] h-[6px] bg-[#E2E2E2] rounded-full" />
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="pt-8">
                        <span className="inline-block px-2 py-1 rounded-[6px] bg-[#EAF6EF] text-[#53B175] text-[11px] font-bold mb-3">
                            {product.category}
                        </span>

                        <div className="flex items-start justify-between gap-4 mb-1">
                            <h1 className="text-[24px] font-extrabold text-[#181725] leading-tight flex-1">
                                {product.name}
                            </h1>
                            <div className="flex items-center gap-2 pt-1.5">
                                <button 
                                    onClick={() => toggleWishlist(vendorProductForContext)}
                                    className="text-[#181725] active:scale-90 transition-transform"
                                >
                                    <Heart 
                                        size={21} 
                                        className={cn("transition-colors", isLiked ? "text-red-500 fill-red-500" : "text-[#181725]")} 
                                        strokeWidth={1.5} 
                                    />
                                </button>
                                <button className="text-[#181725]">
                                    <Share2 size={21} strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>
                        <p className="text-[15px] font-medium text-[#7C7C7C] mb-6">{product.weight || '1 kg'}</p>

                        {/* Tiered Pricing Section */}
                        <div className="bg-[#F1FBF4]/40 border border-[#53B175]/15 rounded-[22px] overflow-hidden mb-6">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#53B175]/10">
                                <span className="text-[15px] font-bold text-[#53B175]">₹ 147/kg for 3 kg</span>
                                <button 
                                    onClick={() => handleAdd(3)}
                                    className="bg-white border border-gray-100 rounded-full px-4 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#53B175] active:scale-95 transition-transform shadow-sm"
                                >
                                    <Plus size={16} strokeWidth={3.5} /> ADD
                                </button>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3">
                                <span className="text-[15px] font-bold text-[#53B175]">₹ 245/kg for 5 kg</span>
                                <button 
                                    onClick={() => handleAdd(5)}
                                    className="bg-white border border-gray-100 rounded-full px-4 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#53B175] active:scale-95 transition-transform shadow-sm"
                                >
                                    <Plus size={16} strokeWidth={3.5} /> ADD
                                </button>
                            </div>
                        </div>

                        {/* Final Price Row */}
                        <div className="flex items-baseline gap-1.5 mb-6">
                            <span className="text-[22px] font-black text-[#181725]">₹ {product.vendors?.[0]?.price.split('/')[0].replace('₹', '') || '49'}</span>
                            <span className="text-[15px] text-[#7C7C7C] font-semibold"> /kg</span>
                        </div>

                        {/* Add to Cart Button */}
                        <button 
                            onClick={() => handleAdd(1)}
                            className="w-full py-4 bg-[#EAF7EF] rounded-[20px] border border-[#53B175]/30 flex items-center justify-center gap-3 text-[#53B175] text-[16px] font-bold transition-all active:scale-95 hover:bg-[#E2F2E8]"
                        >
                            <span>Add To Cart</span>
                            <ShoppingCart size={20} />
                        </button>
                    </div>
                </div>

                {/* Product details Section */}
                <div className="mt-4 mx-4 bg-white rounded-[18px] p-5 shadow-sm border border-gray-50">
                    <h2 className="text-[20px] font-bold text-[#181725] mb-3">Product details</h2>
                    <p className="text-[14px] text-[#4C4C4C] leading-[1.6] font-medium opacity-80">
                        {product.description}
                    </p>
                </div>

                {/* Similar items Section */}
                <div className="mt-6 px-4">
                    <h2 className="text-[18px] font-bold text-[#181725] mb-4">Similar items</h2>
                    <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 snap-x">
                        {similarItemsList.map((item: any) => (
                            <Link
                                key={item.id}
                                href={`/product/${item.originalId || item.id}`}
                                className="min-w-[150px] bg-white border border-gray-100 rounded-[18px] p-3 flex flex-col snap-start shadow-sm"
                            >
                                <div className="w-full aspect-[4/3] flex items-center justify-center mb-3">
                                    <img src={item.image} alt={item.name} className="max-w-[80%] max-h-full object-contain" />
                                </div>
                                <h3 className="text-[13px] font-bold text-[#181725] leading-tight line-clamp-1 mb-1">{item.name}</h3>
                                <p className="text-[10px] text-[#7C7C7C] font-medium">Sold by {item.vendorCount || 3} vendors</p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* More from Category */}
                <div className="mt-2 px-4">
                    <h2 className="text-[18px] font-bold text-[#181725] mb-4">More from {product.category}</h2>
                    <div className="flex gap-4 overflow-x-auto pb-10 no-scrollbar">
                        <div className="min-w-[140px] relative">
                            <img src={product.image} className="w-[140px] h-[100px] object-contain" />
                            <Plus size={20} className="absolute bottom-0 right-0 bg-[#53B175] text-white rounded-full p-1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Everyday Items & Delivery Poster */}
            <div className="mt-0">
                <PromotionBanners />
            </div>
            <div className="mt-0">
                <DeliveryPoster />
            </div>

            {/* Desktop View (Placeholder/Idea) */}
            <div className="hidden lg:block max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-12">
                <p className="text-center text-gray-400">Please switch to mobile view or resize the screen for the best experience.</p>
            </div>
        </div>
    );
}
