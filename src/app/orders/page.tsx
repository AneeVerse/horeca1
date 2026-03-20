'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Heart, ShoppingCart, Star, Home, Package } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { dal } from '@/lib/dal';
import { useWishlist } from '@/context/WishlistContext';
import type { VendorProduct, Vendor } from '@/types';
import { cn } from '@/lib/utils';

interface OrderItem {
    id: string;
    image: string;
    fullProduct?: any;
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
    const [allProducts, setAllProducts] = React.useState<VendorProduct[]>([]);
    const [vendorsList, setVendorsList] = React.useState<Vendor[]>([]);

    React.useEffect(() => {
        dal.vendors.list()
            .then(result => {
                setVendorsList(result.vendors);
                // Fetch products for each vendor
                return Promise.all(
                    result.vendors.map(v =>
                        dal.vendors.getProducts(v.id)
                            .then(r => r.products)
                            .catch(() => [] as VendorProduct[])
                    )
                );
            })
            .then(productArrays => {
                setAllProducts(productArrays.flat());
            })
            .catch(() => {
                setVendorsList([]);
                setAllProducts([]);
            });
    }, []);

    React.useEffect(() => {
        dal.orders.list()
            .then(result => {
                const apiOrders = (result.orders || []) as Order[];
                setOrders(prev => [...apiOrders, ...MOCK_ORDERS]);
            })
            .catch(() => {
                // Fallback to localStorage if API fails (e.g., not logged in)
                const saved = localStorage.getItem('horeca_orders');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        setOrders([...parsed, ...MOCK_ORDERS]);
                    } catch (e) {
                        console.error('Failed to load orders:', e);
                    }
                }
            });
    }, []);

    const handleOrderAgain = (order: Order) => {
        let itemsAdded = 0;
        
        order.items.forEach(item => {
            if (item.fullProduct) {
                addToCart(item.fullProduct, 1);
                itemsAdded++;
                return;
            }

            const product = allProducts.find(p => p.id === item.id);

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

            {/* Mobile Header */}
            <div className="md:hidden sticky top-[12px] z-50 bg-[#F2F3F2] px-2 min-[340px]:px-4 h-16 flex items-center justify-between">
                <button onClick={() => router.push('/')} className="p-2 -ml-1 flex-shrink-0">
                    <ChevronLeft size={22} className="text-[#181725]" />
                </button>
                <h1 className="text-[16px] min-[340px]:text-[20px] font-bold text-[#181725] absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                    Your Orders
                </h1>
                <div className="flex items-center gap-1 min-[340px]:gap-4 flex-shrink-0">
                    <div className="w-10 h-10" />
                </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:block bg-[#F7F8FA] border-b border-gray-100">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-5">
                    <div className="flex items-center gap-2 text-[13px] text-text-muted mb-3">
                        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
                            <Home size={14} />
                            <span>Home</span>
                        </Link>
                        <ChevronRight size={12} />
                        <span className="text-text font-semibold">Orders</span>
                    </div>
                    <h1 className="text-[28px] font-black text-text tracking-tight">
                        <Package size={28} className="inline-block mr-3 -mt-1 text-primary" />
                        Your Orders
                    </h1>
                </div>
            </div>

            {/* Orders List */}
            <div className="p-4 space-y-4 pb-24 md:pb-16 max-w-[600px] md:max-w-[var(--container-max)] mx-auto md:px-[var(--container-padding)] md:pt-8 flex-1">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-gray-100/80 rounded-full flex items-center justify-center mb-6">
                            <Package size={40} className="text-gray-300" strokeWidth={1.5} />
                        </div>
                        <h2 className="text-[20px] font-bold text-[#181725] mb-2">No orders yet</h2>
                        <p className="text-[14px] text-gray-400 font-medium max-w-[200px] mx-auto">
                            You haven't placed any orders yet. Start shopping to see them here!
                        </p>
                        <button 
                            onClick={() => router.push('/')}
                            className="mt-8 px-8 py-3 bg-[#53B175] text-white font-bold rounded-2xl transition-all shadow-lg shadow-green-100 hover:bg-[#48a068]"
                        >
                            Start Shopping
                        </button>
                    </div>
                ) : (
                    <div className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-7">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white rounded-[24px] md:rounded-3xl border border-[#E2E2E2] overflow-hidden shadow-sm md:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-primary/20 transition-all duration-300 mb-5 md:mb-0 flex flex-col group h-full">
                                <div className="p-5 md:p-7 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-1">
                                            <div className={cn(
                                                "px-3 py-1 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-wider mb-2 inline-block",
                                                order.status.toLowerCase().includes('delivered') ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                                            )}>
                                                {order.status}
                                            </div>
                                            <h3 className="text-[17px] md:text-[19px] font-black text-[#181725]">Order #{order.id.slice(-6).toUpperCase()}</h3>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[18px] md:text-[20px] font-black text-primary">₹{order.price}</span>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[12px] md:text-[13px] text-[#7C7C7C] font-medium mb-6 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                        {order.date}
                                    </p>

                                    {/* Product Images */}
                                    <div className="flex gap-3 overflow-x-auto no-scrollbar mb-7 py-1 px-0.5">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="w-[55px] h-[55px] md:w-[68px] md:h-[68px] min-w-[55px] md:min-w-[68px] rounded-2xl border border-[#F0F0F0] flex items-center justify-center p-2 bg-white shadow-sm group-hover:border-primary/10 transition-colors">
                                                <img src={item.image} alt="product" className="max-w-full max-h-full object-contain" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Rating Area */}
                                    {order.rating !== undefined && (
                                        <div className="bg-gray-50/50 rounded-2xl p-4 md:p-5 mt-auto">
                                            <div className="flex flex-col gap-3">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[12px] md:text-[13px] text-gray-500 font-bold opacity-90 uppercase tracking-tight">Your delivery rating</span>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star 
                                                                key={s} 
                                                                size={18} 
                                                                className={s <= (order.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-[#D3D3D3] fill-none"} 
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="pt-2">
                                                    <button 
                                                        onClick={() => handleOrderAgain(order)}
                                                        className="text-primary font-black text-[14px] md:text-[15px] hover:underline underline-offset-4 decoration-2"
                                                    >
                                                        Order Again
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Split Actions (for unrated orders) */}
                                {order.rating === undefined && (
                                    <div className="flex items-center border-t border-[#F2F3F2] mt-auto">
                                        <button className="flex-1 py-4 md:py-5 text-center font-black text-[#4C4F4D] text-[14px] md:text-[15px] active:bg-gray-50 transition-colors md:hover:bg-gray-50 uppercase tracking-wider">
                                            Rate Order
                                        </button>
                                        <div className="w-[1px] h-10 bg-[#F2F3F2]" />
                                        <button 
                                            onClick={() => handleOrderAgain(order)}
                                            className="flex-1 py-4 md:py-5 text-center font-black text-red-500 text-[14px] md:text-[15px] active:bg-red-50/50 transition-colors md:hover:bg-red-50 uppercase tracking-wider"
                                        >
                                            Order Again
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
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
