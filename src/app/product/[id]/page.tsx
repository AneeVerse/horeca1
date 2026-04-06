'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ArrowLeft,
    Heart,
    ChevronDown,
    ChevronUp,
    Plus,
    ShoppingCart,
    Search,
    X,
    Share2,
    Info,
    ShieldCheck,
    Leaf,
    ArrowRight,
    Store
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PromotionBanners } from '@/components/features/PromotionBanners';
import { DeliveryPoster } from '@/components/features/DeliveryPoster';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { toast } from 'sonner';
import { dal } from '@/lib/dal';
import type { Vendor as DalVendor, VendorProduct } from '@/types';

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

    // Fetch vendors from DAL for recently-viewed tracking
    const [dalVendors, setDalVendors] = useState<DalVendor[]>([]);
    useEffect(() => {
        dal.vendors.list().then(({ vendors }) => setDalVendors(vendors)).catch(() => {});
    }, []);

    // Track recently viewed vendor for "Continue Ordering" section
    useEffect(() => {
        if (!vendorName) return;
        try {
            const matched = dalVendors.find(v => v.name.toLowerCase() === vendorName.toLowerCase() || v.slug === vendorName.toLowerCase());

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
    }, [vendorName, productName, dalVendors]);

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

    const handleShare = async () => {
        const shareData = {
            title: product.name,
            text: `Check out ${product.name} from ${vendorName} on Horeca1`,
            url: window.location.href,
        };

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard!', {
                    description: 'You can now share it with others.',
                });
            }
        } catch (err) {
            // Only show error if it's not a user cancellation
            if (err instanceof Error && err.name !== 'AbortError') {
                toast.error('Failed to share link');
            }
        }
    };

    return (
        <div className="bg-[#FFFFFF] min-h-screen">
            {/* Top Green Bar (Mobile Only) */}
            <div className="w-full h-[5px] bg-[#53B175] md:hidden" />

            {/* Mobile Header */}
            <header className="md:hidden bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-[100] border-b border-gray-50">
                <button onClick={() => router.back()} className="p-1">
                    <ArrowLeft size={22} className="text-[#181725]" strokeWidth={2} />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 text-[18px] font-extrabold text-[#181725] tracking-tight whitespace-nowrap">
                    {vendorName}
                </div>
                <div className="w-8" />
            </header>

            {/* --- MOBILE VIEW (Simplified Layout) --- */}
            <div className="md:hidden bg-[#F8F9FB]/30">
                <main className="mx-0 bg-white pt-2 pb-8 px-5 rounded-b-[30px] shadow-sm">
                    {/* Image Section */}
                    <div className="relative flex flex-col items-center pt-4">
                        <div className="relative w-[240px] h-[240px] flex items-center justify-center p-4">
                            <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                sizes="240px"
                                priority
                                className="object-contain p-4"
                            />
                        </div>
                        <div className="flex gap-1.5 mt-4">
                            <div className="w-[18px] h-[6px] bg-[#7C7C7C] rounded-full" />
                            <div className="w-[6px] h-[6px] bg-[#E2E2E2] rounded-full" />
                            <div className="w-[6px] h-[6px] bg-[#E2E2E2] rounded-full" />
                            <div className="w-[6px] h-[6px] bg-[#E2E2E2] rounded-full" />
                        </div>
                    </div>

                    <div className="pt-8">
                        <span className="inline-block px-2 py-1 rounded-[6px] bg-[#EAF6EF] text-[#53B175] text-[11px] font-bold mb-3 uppercase tracking-wider">{product.category}</span>
                        <div className="flex items-start justify-between gap-4 mb-1">
                            <h1 className="text-[24px] font-extrabold text-[#181725] leading-tight flex-1 tracking-tight">{product.name}</h1>
                            <div className="flex items-center gap-2 pt-1.5">
                                <button onClick={() => toggleWishlist(vendorProductForContext)} className="text-[#181725] active:scale-90 transition-transform">
                                    <Heart size={21} className={cn("transition-colors", isLiked ? "text-red-500 fill-red-500" : "text-[#181725]")} />
                                </button>
                                <button onClick={handleShare} className="text-[#181725] active:scale-90 transition-transform">
                                    <Share2 size={21} />
                                </button>
                            </div>
                        </div>
                        <p className="text-[15px] font-medium text-[#7C7C7C] mb-6">{product.weight || '1 kg'}</p>

                        {/* Mobile Tiered Pricing Box */}
                        <div className="bg-[#F1FBF4]/40 border border-[#53B175]/15 rounded-[22px] overflow-hidden mb-6">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#53B175]/10">
                                <span className="text-[15px] font-bold text-[#53B175]">₹ 147/kg for 3 kg</span>
                                <button onClick={() => handleAdd(3)} className="bg-white border border-gray-100 rounded-full px-4 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#53B175] active:scale-95 shadow-sm">
                                    <Plus size={16} strokeWidth={3} /> ADD
                                </button>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3">
                                <span className="text-[15px] font-bold text-[#53B175]">₹ 245/kg for 5 kg</span>
                                <button onClick={() => handleAdd(5)} className="bg-white border border-gray-100 rounded-full px-4 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#53B175] active:scale-95 shadow-sm">
                                    <Plus size={16} strokeWidth={3} /> ADD
                                </button>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-1.5 mb-6">
                            <span className="text-[22px] font-black text-[#181725]">₹ {productPrice}</span>
                            <span className="text-[15px] text-[#7C7C7C] font-semibold"> /kg</span>
                        </div>

                        <button onClick={() => handleAdd(1)} className="w-full py-4 bg-[#EAF7EF] rounded-[20px] border border-[#53B175]/30 flex items-center justify-center gap-3 text-[#53B175] text-[16px] font-bold transition-all active:scale-95 hover:bg-[#E2F2E8]">
                            <span>Add To Cart</span>
                            <ShoppingCart size={20} />
                        </button>
                    </div>
                </main>

                {/* Mobile Product details Section */}
                <div className="mt-4 mx-4 bg-white rounded-[18px] p-5 shadow-sm border border-gray-50">
                    <h2 className="text-[18px] font-extrabold text-[#181725] mb-3">Product details</h2>
                    <p className="text-[14px] text-[#4C4C4C] leading-[1.6] font-medium opacity-80">{product.description}</p>
                </div>

                {/* Mobile Similar items */}
                <div className="mt-6 px-4">
                    <h2 className="text-[18px] font-bold text-[#181725] mb-4">Similar items</h2>
                    <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 snap-x">
                        {similarItemsList.map((item: any) => (
                            <Link key={item.id} href={`/product/${item.originalId || item.id}`} className="min-w-[150px] bg-white border border-gray-100 rounded-[18px] p-3 flex flex-col snap-start shadow-sm">
                                <div className="w-full aspect-[4/3] flex items-center justify-center mb-3">
                                    <img src={item.image} alt={item.name} className="max-w-[80%] max-h-full object-contain" />
                                </div>
                                <h3 className="text-[13px] font-bold text-[#181725] leading-tight line-clamp-1 mb-1">{item.name}</h3>
                                <p className="text-[10px] text-[#7C7C7C] font-medium">Sold by {item.vendorCount || 3} vendors</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- DESKTOP & TABLET VIEW (Professional Layout) --- */}
            <div className="hidden md:block">
                <main className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] pb-24 pt-14">
                    {/* Upper Professional Section */}
                    <div className="grid grid-cols-12 gap-12 lg:gap-20">
                        {/* Left: Professional Showcase */}
                        <div className="col-span-12 lg:col-span-5">
                            <div className="w-full aspect-square bg-[#F8F9FB]/50 rounded-[48px] flex items-center justify-center p-12 relative overflow-hidden group border border-gray-50/50 shadow-[0_15px_60px_-15px_rgba(0,0,0,0.03)]">
                                <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 40vw"
                                    priority
                                    className="object-contain p-12 transition-all duration-700 group-hover:scale-110"
                                />
                                <div className="absolute bottom-10 flex gap-2.5">
                                    <div className="w-8 h-1.5 bg-[#53B175] rounded-full" />
                                    <div className="w-2 h-1.5 bg-[#E2E2E2] rounded-full" />
                                    <div className="w-2 h-1.5 bg-[#E2E2E2] rounded-full" />
                                </div>
                                <div className="absolute top-8 left-8 flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl border border-green-50 shadow-sm">
                                    <ShieldCheck size={16} className="text-[#53B175]" />
                                    <span className="text-[12px] font-black text-[#181725] uppercase tracking-widest">Quality Verified</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Professional Actions */}
                        <div className="col-span-12 lg:col-span-7 flex flex-col pt-4">
                            <div className="flex items-center gap-2 text-[12px] font-black text-[#7C7C7C] mb-8 uppercase tracking-[0.2em] opacity-50">
                                <Link href="/" className="hover:text-[#53B175]">Home</Link>
                                <span>/</span>
                                <span className="text-[#53B175]">{product.category}</span>
                            </div>

                            <div className="flex items-start justify-between gap-10 mb-4">
                                <h1 className="text-[44px] lg:text-[54px] font-black text-[#181725] leading-[1.02] tracking-tighter">
                                    {product.name}
                                </h1>
                                <div className="flex items-center gap-4 pt-4 shrink-0">
                                    <button onClick={() => toggleWishlist(vendorProductForContext)} className="w-14 h-14 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm active:scale-90">
                                        <Heart size={26} className={cn("transition-colors", isLiked ? "text-red-500 fill-red-500" : "text-[#181725]")} />
                                    </button>
                                    <button onClick={handleShare} className="w-14 h-14 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm active:scale-90 transition-transform">
                                        <Share2 size={26} className="text-[#181725]" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-5 mb-12">
                                <span className="text-[24px] font-bold text-[#7C7C7C]">{product.weight || '1 kg'}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                                <span className="text-[17px] font-medium text-gray-500">Procured by <span className="text-[#181725] font-black underline decoration-[#53B175]/30 underline-offset-4">{vendorName}</span></span>
                            </div>

                            {/* Desktop Professional Pricing Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                                <div className="bg-[#F1FBF4]/40 border border-[#53B175]/15 rounded-[32px] p-7 transition-all hover:bg-[#F1FBF4]/60">
                                    <div className="flex items-center justify-between mb-5">
                                        <span className="text-[13px] font-black text-[#53B175] uppercase tracking-widest">Standard Bulk</span>
                                        <span className="bg-[#53B175] text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-wide">3 KG MIN</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[24px] font-black text-[#181725]">₹ 147<span className="text-[15px] text-gray-400">/kg</span></span>
                                            <span className="text-[12px] text-[#53B175] font-bold">Recommended</span>
                                        </div>
                                        <button onClick={() => handleAdd(3)} className="bg-[#53B175] text-white rounded-full px-7 py-3 flex items-center gap-2 text-[13px] font-black active:scale-95 transition-all shadow-lg shadow-green-200">
                                            <Plus size={16} strokeWidth={3} /> ADD
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-[#F1FBF4]/40 border border-[#53B175]/15 rounded-[32px] p-7 transition-all hover:bg-[#F1FBF4]/60">
                                    <div className="flex items-center justify-between mb-5">
                                        <span className="text-[13px] font-black text-[#53B175] uppercase tracking-widest">Institutional</span>
                                        <span className="bg-[#53B175] text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-wide">5 KG MIN</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[24px] font-black text-[#181725]">₹ 245<span className="text-[15px] text-gray-400">/kg</span></span>
                                            <span className="text-[12px] text-[#53B175] font-bold">Best Value</span>
                                        </div>
                                        <button onClick={() => handleAdd(5)} className="bg-[#53B175] text-white rounded-full px-7 py-3 flex items-center gap-2 text-[13px] font-black active:scale-95 transition-all shadow-lg shadow-green-200">
                                            <Plus size={16} strokeWidth={3} /> ADD
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop Action Summary */}
                            <div className="flex items-center gap-8 pt-2">
                                <div className="flex items-baseline gap-2 min-w-[160px]">
                                    <span className="text-[48px] font-black text-[#181725]">₹ {productPrice}</span>
                                    <span className="text-[20px] text-[#7C7C7C] font-bold">/kg</span>
                                </div>
                                <button onClick={() => handleAdd(1)} className="flex-1 h-[72px] bg-[#53B175] text-white rounded-[28px] flex items-center justify-center gap-4 text-[20px] font-black transition-all active:scale-[0.98] hover:bg-[#489e67] shadow-2xl shadow-green-100">
                                    <span>Add To Cart</span>
                                    <ShoppingCart size={24} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Information Sections (Desktop/Tab Specific) */}
                    <div className="mt-32 grid grid-cols-12 gap-16 lg:gap-24">
                        <div className="col-span-12 lg:col-span-8 space-y-20">
                            <div>
                                <h3 className="text-[28px] font-black text-[#181725] mb-10 flex items-center gap-4">
                                    <Info size={28} className="text-[#53B175]" />
                                    Product Overview
                                </h3>
                                <p className="text-[18px] text-[#4C4C4C] leading-[1.8] font-medium opacity-90 border-l-[6px] border-[#53B175]/40 pl-10 mb-12 italic bg-[#F1FBF4]/20 py-10 rounded-r-3xl">
                                    {product.description}
                                    {" Certified as commercial-grade produce, ideal for high-volume kitchen operations. Our sourcing methodology guarantees uniform size metrics and consistent density across every delivery batch."}
                                </p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mt-10">
                                    <div className="bg-white rounded-[32px] p-10 border border-gray-100 shadow-sm">
                                        <h4 className="text-[18px] font-black text-[#181725] mb-8 border-b border-gray-50 pb-5 uppercase tracking-wide">Technical Specs</h4>
                                        <div className="space-y-4">
                                            {[
                                                { l: 'Origin', v: 'Verified Local Farms' },
                                                { l: 'Grade', v: 'Procurement Choice' },
                                                { l: 'Storage', v: 'Cool & Dry Profile' },
                                                { l: 'Standard', v: 'Horeca Certified' }
                                            ].map((s, i) => (
                                                <div key={i} className="flex justify-between items-center py-1">
                                                    <span className="text-[13px] font-bold text-gray-400 mb-0.5 uppercase tracking-wider">{s.l}</span>
                                                    <span className="text-[15px] font-black text-[#181725]">{s.v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-[#F8F9FB] rounded-[32px] p-10">
                                        <h4 className="text-[18px] font-black text-[#181725] mb-6 uppercase tracking-wide">Commercial Advice</h4>
                                        <p className="text-[15px] text-gray-500 leading-relaxed font-semibold">
                                            Optimized for recipe standardization. Minimal waste percentage ensured through 12-point grading check at our fulfillment center.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
                            <h3 className="text-[22px] font-black text-[#181725] mb-2">Quality Trust</h3>
                            {[
                                { t: 'Farm-Direct Network', d: 'Eliminating middle-men for freshness.', i: Leaf, c: 'bg-emerald-50 text-emerald-600' },
                                { t: 'Batch Verification', d: 'Verified by certified specialists.', i: ShieldCheck, c: 'bg-blue-50 text-blue-600' },
                                { t: 'Commercial Sourcing', d: 'Uniform metrics for professionals.', i: Store, c: 'bg-orange-50 text-orange-600' }
                            ].map((p, i) => {
                                const Icon = p.i;
                                return (
                                    <div key={i} className="flex gap-6 p-2 group transition-all">
                                        <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-sm", p.c)}>
                                            <Icon size={28} />
                                        </div>
                                        <div className="flex flex-col pt-1">
                                            <h4 className="text-[17px] font-black text-[#181725] mb-1">{p.t}</h4>
                                            <p className="text-[14px] text-gray-400 font-bold leading-snug">{p.d}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Market Alternatives (Desktop Similar) */}
                    <div className="mt-40 pt-24 border-t border-gray-100">
                        <div className="flex items-end justify-between mb-16 px-2">
                            <div>
                                <h2 className="text-[44px] font-black text-[#181725] tracking-tighter">Market Alternatives</h2>
                                <p className="text-gray-400 font-bold mt-2 text-[17px]">Complete your procurement with these verified alternatives</p>
                            </div>
                            <div className="flex gap-3">
                                <button className="w-14 h-14 rounded-full border border-gray-100 flex items-center justify-center hover:bg-[#53B175] hover:text-white transition-all bg-white shadow-sm"><ArrowLeft size={22} /></button>
                                <button className="w-14 h-14 rounded-full border border-gray-100 flex items-center justify-center hover:bg-[#53B175] hover:text-white transition-all bg-white shadow-sm"><ArrowRight size={22} /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-10">
                            {similarItemsList.map((item: any) => (
                                <Link key={item.id} href={`/product/${item.originalId || item.id}`} className="bg-white border border-gray-100 rounded-[48px] p-7 flex flex-col hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-3 transition-all group relative overflow-hidden">
                                    <div className="w-full aspect-square flex items-center justify-center mb-8 bg-[#F8F9FB]/50 rounded-[38px] overflow-hidden group-hover:bg-[#F1FBF4]/50 transition-colors duration-500">
                                        <img src={item.image} alt={item.name} className="max-w-[75%] max-h-[75%] object-contain group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                    <h3 className="text-[18px] font-black text-[#181725] leading-tight line-clamp-2 mb-4 group-hover:text-[#53B175] transition-colors">{item.name}</h3>
                                    <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-6">
                                        <span className="text-[14px] text-[#7C7C7C] font-bold">Sold by {item.vendorCount || 3} vendors</span>
                                        <div className="w-11 h-11 rounded-2xl bg-[#EAF6EF] flex items-center justify-center text-[#53B175] group-hover:bg-[#53B175] group-hover:text-white transition-all shadow-sm">
                                            <Plus size={22} strokeWidth={3} />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            {/* Global Promotion/Footer Banners */}
            <div className="w-full">
                <PromotionBanners />
                <DeliveryPoster />
            </div>
        </div>
    );
}
