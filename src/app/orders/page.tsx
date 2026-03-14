'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, ShoppingCart, Star } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { ALL_MOCK_PRODUCTS } from '@/lib/mockData';
import { vendors } from '@/data/vendorData';
import { useWishlist } from '@/context/WishlistContext';

interface OrderItem {
    id: string;
    image: string;
    fullProduct?: any; // To store the complete product data if available
}

interface Order {
    id: string;
    status: string;
    date: string;
    price: number;
    items: OrderItem[];
    rating?: number;
    canRate?: boolean;
}

const MOCK_ORDERS: Order[] = [
    {
        id: '1',
        status: 'Order delivered',
        date: 'Placed at 14th Feb 2025, 03:55 pm',
        price: 569,
        items: [
            { id: 'p1', image: '/images/category/milk.png' },
            { id: 'p2', image: '/images/category/vegitable.png' },
            { id: 'p3', image: '/images/category/fruits.png' },
            { id: 'p4', image: '/images/category/snacks.png' },
            { id: 'p5', image: '/images/category/milk.png' },
            { id: 'p6', image: '/images/category/vegitable.png' },
        ],
        rating: 3,
        canRate: false
    },
    {
        id: '2',
        status: 'Order delivered',
        date: 'Placed at 9th Feb 2025, 12:55 pm',
        price: 1335,
        items: [
            { id: 'p1', image: '/images/category/vegitable.png' },
            { id: 'p2', image: '/images/category/fruits.png' },
            { id: 'p3', image: '/images/category/snacks.png' },
            { id: 'p4', image: '/images/category/milk.png' },
            { id: 'p5', image: '/images/category/vegitable.png' },
        ],
        canRate: true
    }
];

export default function OrderHistoryPage() {
    const router = useRouter();
    const { totalItems, addToCart } = useCart();
    const { wishlist } = useWishlist();
    const [orders, setOrders] = React.useState<Order[]>(MOCK_ORDERS);

    React.useEffect(() => {
        const saved = localStorage.getItem('horeca_orders');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Combine saved orders with mock orders, putting new ones first
                setOrders([...parsed, ...MOCK_ORDERS]);
            } catch (e) {
                console.error('Failed to load orders:', e);
            }
        }
    }, []);

    const handleOrderAgain = (order: Order) => {
        let itemsAdded = 0;
        
        order.items.forEach(item => {
            // 1. Check if the full product was already saved in the order (Robustness)
            if (item.fullProduct) {
                addToCart(item.fullProduct, 1);
                itemsAdded++;
                return;
            }

            // 2. Fallback: Search in static mock products
            let product = ALL_MOCK_PRODUCTS.find(p => p.id === item.id);
            
            // 3. Fallback: Search in vendors data (Swiggy model)
            if (!product) {
                for (const v of vendors) {
                    for (const cat of v.catalog) {
                        const found = cat.products.find(p => p.id === item.id);
                        if (found) {
                            // Map it to the VendorProduct type expected by addToCart
                            product = {
                                ...found,
                                id: found.id,
                                name: found.name,
                                description: '',
                                price: found.price,
                                originalPrice: found.originalPrice,
                                images: [found.image],
                                category: cat.name,
                                packSize: found.unit,
                                unit: found.unit,
                                stock: found.inStock ? 100 : 0,
                                isActive: true,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                vendorId: v.id,
                                vendorName: v.name,
                                bulkPrices: [],
                                creditBadge: v.creditEnabled,
                                minOrderQuantity: 1
                            } as any;
                            break;
                        }
                    }
                    if (product) break;
                }
            }

            if (product) {
                addToCart(product, 1);
                itemsAdded++;
            }
        });

        if (itemsAdded > 0) {
            toast.success(`Order #${order.id.slice(-6)} items added to cart!`, {
                description: `Successfully added ${itemsAdded} items back to your cart.`,
                duration: 2500,
            });
            router.push('/cart');
        } else {
            toast.error("Could not add items to cart", {
                description: "Sorry, we couldn't find these products in our current catalog. Please find them via search."
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F3F2]">

            {/* Header */}
            <div className="sticky top-[12px] z-50 bg-[#F2F3F2] px-2 min-[340px]:px-4 h-16 flex items-center justify-between">
                <button onClick={() => router.back()} className="p-2 -ml-1 flex-shrink-0">
                    <ChevronLeft size={22} className="text-[#181725]" />
                </button>
                <h1 className="text-[16px] min-[340px]:text-[20px] font-bold text-[#181725] absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                    Your Orders
                </h1>
                <div className="flex items-center gap-1 min-[340px]:gap-4 flex-shrink-0">
                    <div className="w-10 h-10" /> {/* Spacer to keep title centered */}
                </div>
            </div>

            {/* Orders List */}
            <div className="p-4 space-y-4 pb-24 max-w-[600px] mx-auto">
                {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-[18px] border border-[#CFCECE] overflow-hidden">
                        <div className="p-5 md:p-6">
                            <div className="flex justify-between items-center mb-1">
                                <h2 className="text-[18px] font-bold text-[#181725]">{order.status}</h2>
                                <span className="text-[18px] font-bold text-[#181725]">₹ {order.price}</span>
                            </div>
                            <p className="text-[13px] text-[#7C7C7C] mb-5">{order.date}</p>

                            {/* Product Images */}
                            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 py-0.5">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="w-[50px] h-[50px] min-w-[50px] rounded-[8px] border border-[#CFCECE] flex items-center justify-center p-1 bg-white">
                                        <img src={item.image} alt="product" className="max-w-[85%] max-h-[85%] object-contain" />
                                    </div>
                                ))}
                            </div>

                            {/* Rating Area (for rated orders) */}
                            {order.rating !== undefined ? (
                                <div className="flex flex-col gap-5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] text-[#1a2b4b] font-medium leading-tight opacity-90">Your delevery experience rating:</span>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star 
                                                    key={s} 
                                                    size={18} 
                                                    className={s <= (order.rating || 0) ? "fill-[#53B175] text-[#53B175]" : "text-[#D3D3D3] fill-none"} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="w-full flex justify-center pt-2">
                                        <button 
                                            onClick={() => handleOrderAgain(order)}
                                            className="text-[#FF4B4B] font-bold text-[16px] hover:opacity-80 transition-opacity"
                                        >
                                            Order Again
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Footer Split Actions (for unrated orders) */}
                        {order.rating === undefined && (
                            <div className="flex items-center border-t border-[#F2F3F2]">
                                <button className="flex-1 py-4.5 text-center font-bold text-[#4C4F4D] text-[16px] active:bg-gray-50 transition-colors">
                                    Rate Order
                                </button>
                                <div className="w-[1px] h-8 bg-[#F2F3F2]" />
                                <button 
                                    onClick={() => handleOrderAgain(order)}
                                    className="flex-1 py-4.5 text-center font-bold text-[#FF4B4B] text-[16px] active:bg-gray-50 transition-colors"
                                >
                                    Order Again
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
