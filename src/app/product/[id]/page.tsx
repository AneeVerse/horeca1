'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Heart,
    ChevronDown,
    ChevronUp,
    Plus,
    ShoppingCart
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PromotionBanners } from '@/components/features/PromotionBanners';
import { DeliveryPoster } from '@/components/features/DeliveryPoster';

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
    const product = PRODUCTS_DATA[id] || PRODUCTS_DATA['default'];

    const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);

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
            <header className="bg-white px-4 py-3 flex items-center justify-between md:hidden uppercase">
                <button onClick={() => router.back()} className="p-1">
                    <ArrowLeft size={24} className="text-[#181725]" strokeWidth={2.5} />
                </button>
                <div className="flex-1" />
            </header>

            {/* Mobile View */}
            <div className="md:hidden pb-10">
                {/* Image Section */}
                <div className="bg-white px-4 pt-1 pb-8 flex flex-col items-center">


                    <div className="flex items-center gap-[0.5px] mt-10">
                        {/* Product Image Container */}
                        <div className="w-[215px] h-[215px] flex items-center justify-center overflow-hidden">
                            <img
                                src={product.image}
                                alt={product.name}
                                className={cn(
                                    "w-full h-full object-contain transition-transform duration-300",
                                    (product.name.toLowerCase().includes('onion') ||
                                        product.name.toLowerCase().includes('cheese') ||
                                        product.name.toLowerCase().includes('gemini'))
                                        ? "scale-[1.0]" : "scale-[1.3]"
                                )}
                            />
                        </div>

                        {/* Side Banner (Double Red Bar) - Exact as per screenshot */}
                        <div className="flex flex-col gap-[3px] w-[44px] h-[215px]">
                            {/* Top Part: Product Name Tag */}
                            <div className="flex-1 bg-[#DA251C] rounded-tr-[12px] rounded-tl-[4px] rounded-br-[4px] rounded-bl-[4px] flex flex-col items-center justify-center">
                                <span className="text-white font-bold text-[13px] [writing-mode:vertical-lr] flex items-center tracking-[0.16em] uppercase">
                                    {product.sideBanner || 'Product'}
                                </span>
                            </div>

                            {/* Bottom Part: Weight Tag */}
                            <div className="h-[52px] bg-[#DA251C] rounded-[4px] flex flex-col items-center justify-center">
                                <span className="text-white font-black text-[20px] leading-none mb-0.5">{product.weight?.split(' ')[0]}</span>
                                <span className="text-white font-bold text-[10px] uppercase tracking-tighter leading-none">{product.weight?.split(' ')[1]}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pagination Dots */}
                    <div className="flex gap-1.5 mt-8">
                        <div className="w-[9.17px] h-[9.17px] bg-[#299E60] rounded-full" />
                        <div className="w-[9.17px] h-[9.17px] bg-[#E2E2E2] rounded-full" />
                        <div className="w-[9.17px] h-[9.17px] bg-[#E2E2E2] rounded-full" />
                    </div>
                </div>

                {/* Info Section */}
                <div className="px-5 pt-4">
                    <span className="inline-block px-2.5 py-1 rounded-[6px] bg-[#EAF6EF] text-[#53B175] text-[10px] font-bold mb-3">
                        {product.category}
                    </span>

                    <div className="flex items-start justify-between gap-4 mb-6">
                        <h1 className="text-[24px] font-extrabold text-[#181725] leading-[1.2] flex-1">
                            {product.name}
                        </h1>
                        <button className="flex items-center justify-center text-[#7C7C7C] mt-2">
                            <Heart size={24} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Expandable Product Details */}
                    <div className="bg-white border border-[#B8B8B8] rounded-[10px] overflow-hidden mb-6">
                        <button
                            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                            className="w-full px-5 py-4 flex items-center justify-between text-[#181725] font-normal text-[16px] leading-[24px] tracking-[-0.5px]"
                        >
                            Product details
                            {isDetailsExpanded ? <ChevronUp size={20} className="text-[#181725]" /> : <ChevronDown size={20} className="text-[#181725]" />}
                        </button>
                        {isDetailsExpanded && (
                            <div className="px-5 pb-5 pt-0 border-t border-[#B8B8B8]">
                                <p className="text-[14px] text-[#525252] leading-[20px] font-normal mt-4 tracking-[-0.5px]">
                                    {product.description}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Vendor List */}
                    <div>
                        <h2 className="text-[18px] font-medium text-[#181725] mb-5 leading-[28px] tracking-[-0.5px]">
                            Available from vendors
                        </h2>

                        <div className="space-y-4">
                            {product.vendors.map((vendor) => (
                                <div key={vendor.id} className="bg-white border border-[#B8B8B8] rounded-[10px] px-4 py-3 flex flex-col gap-2.5 min-h-[74px] justify-center">
                                    {/* First Row: Name & Min Qty */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-normal text-[#000000] leading-none">{vendor.name}</span>
                                        <div className="w-[53px] h-[13.25px] bg-[#4CAD73]/20 border border-[#4CAD73]/10 rounded-[3px] flex items-center justify-center">
                                            <span className="text-[7.5px] font-bold text-[#4CAD73] whitespace-nowrap">Min Qty: {vendor.minQty}</span>
                                        </div>
                                    </div>

                                    {/* Second Row: Price, Stock & Add */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[18px] font-extrabold text-[#181725] leading-none">{vendor.price}</span>

                                        <div className="w-[53px] h-[13.25px] bg-[#4CAD73]/20 border border-[#4CAD73]/10 rounded-[3px] flex items-center justify-center">
                                            <span className="text-[7.5px] font-bold text-[#4CAD73] whitespace-nowrap">In Stock: {vendor.stock}</span>
                                        </div>

                                        <button className="w-[73px] h-[23.15px] flex items-center justify-center gap-1 border border-[#B8B8B8] rounded-full text-[#4CAD73] font-bold text-[11px] active:scale-95 transition-all">
                                            <Plus size={12} strokeWidth={4} /> ADD
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Similar Items Section */}
                        <div className="mt-10">
                            <h2 className="text-[20px] font-bold text-[#181725] mb-4">
                                Similar items
                            </h2>
                            <div className="flex gap-4 overflow-x-auto -mx-5 px-5 pb-6 no-scrollbar">
                                {similarItemsList.map((item: any) => (
                                    <Link
                                        key={item.id}
                                        href={`/product/${item.originalId || item.id}`}
                                        className="min-w-[155px] w-[155px] h-[168px] bg-white border border-[#B8B8B8] rounded-[10px] p-3 flex flex-col flex-shrink-0 active:scale-95 transition-all"
                                    >
                                        <div className="w-[131px] h-[98px] flex items-center justify-center mb-2 overflow-hidden bg-transparent rounded-[8px]">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="max-w-full max-h-full object-contain p-1"
                                            />
                                        </div>
                                        <div className="mt-auto">
                                            <h3 className="text-[12px] font-semibold text-[#181725] line-clamp-1 leading-tight">{item.name}</h3>
                                            <p className="text-[11px] text-[#7C7C7C] font-normal mt-0.5 whitespace-nowrap">Sold by {item.vendorCount} vendors</p>
                                        </div>
                                    </Link>
                                ))}
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
            </div>

            {/* Desktop View (Placeholder/Idea) */}
            <div className="hidden md:block max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-12">
                <p className="text-center text-gray-400">Please switch to mobile view or resize the screen for the best experience.</p>
            </div>
        </div>
    );
}
