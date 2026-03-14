'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Clock, ChevronRight, ListOrdered, ChevronLeft, Trash2, Edit2, Heart, ShoppingCart } from 'lucide-react';
import { MOCK_ORDER_LISTS, MOCK_VENDORS, MOCK_VENDOR_PRODUCTS } from '@/lib/mockData';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { toast } from 'sonner';
import { CreateListOverlay } from '@/components/features/order-lists/CreateListOverlay';
import type { OrderList } from '@/types';

export default function OrderListsPage() {
    const router = useRouter();
    const { totalItems } = useCart();
    const { wishlist } = useWishlist();
    const [allLists, setAllLists] = React.useState<OrderList[]>([]);
    const [isCreateOverlayOpen, setIsCreateOverlayOpen] = React.useState(false);
    const [editingList, setEditingList] = React.useState<OrderList | null>(null);

    // Initial load: Priority to merged storage, fallback to mock + custom
    React.useEffect(() => {
        const savedAll = localStorage.getItem('horeca_order_lists_all');
        if (savedAll) {
            try {
                const parsed = JSON.parse(savedAll);
                setAllLists(parsed.map((l: any) => ({
                    ...l,
                    createdAt: new Date(l.createdAt),
                    updatedAt: new Date(l.updatedAt),
                    lastUsed: l.lastUsed ? new Date(l.lastUsed) : undefined
                })));
                return;
            } catch (e) {
                console.error('Failed to parse all lists', e);
            }
        }

        // Fallback for first-time or legacy users
        const customSaved = localStorage.getItem('custom_order_lists');
        let customParsed: any[] = [];
        if (customSaved) {
            try {
                customParsed = JSON.parse(customSaved).map((l: any) => ({
                    ...l,
                    createdAt: new Date(l.createdAt),
                    updatedAt: new Date(l.updatedAt),
                    lastUsed: l.lastUsed ? new Date(l.lastUsed) : undefined
                }));
            } catch (e) {}
        }
        
        const merged = [...MOCK_ORDER_LISTS, ...customParsed];
        setAllLists(merged);
        localStorage.setItem('horeca_order_lists_all', JSON.stringify(merged));
    }, []);

    const handleCreateList = (data: { name: string; vendorId: string; items: { productId: string; quantity: number }[] }) => {
        const vendor = MOCK_VENDORS.find(v => v.id === data.vendorId);
        if (!vendor) return;

        let updated: OrderList[];

        if (editingList) {
            const updatedList: OrderList = {
                ...editingList,
                name: data.name,
                vendorName: vendor.name,
                vendorLogo: vendor.logo,
                items: data.items.map(item => {
                    const product = (MOCK_VENDOR_PRODUCTS[data.vendorId] || []).find(p => p.id === item.productId);
                    return {
                        productId: item.productId,
                        product: product!,
                        defaultQty: item.quantity,
                        lastOrderedQty: item.quantity
                    };
                }),
                updatedAt: new Date()
            };

            updated = allLists.map(l => l.id === editingList.id ? updatedList : l);
            toast.success(`List "${data.name}" updated!`);
            setEditingList(null);
        } else {
            const newList: OrderList = {
                id: `custom-${Date.now()}`,
                name: data.name,
                userId: 'u1',
                vendorId: data.vendorId,
                vendorName: vendor.name,
                vendorLogo: vendor.logo,
                items: data.items.map(item => {
                    const product = (MOCK_VENDOR_PRODUCTS[data.vendorId] || []).find(p => p.id === item.productId);
                    return {
                        productId: item.productId,
                        product: product!,
                        defaultQty: item.quantity,
                        lastOrderedQty: item.quantity
                    };
                }),
                createdAt: new Date(),
                updatedAt: new Date(),
                lastUsed: new Date()
            };

            updated = [...allLists, newList];
            toast.success(`List "${data.name}" created!`);
        }

        setAllLists(updated);
        localStorage.setItem('horeca_order_lists_all', JSON.stringify(updated));
    };

    const handleDeleteList = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this list?')) {
            const updated = allLists.filter(l => l.id !== id);
            setAllLists(updated);
            localStorage.setItem('horeca_order_lists_all', JSON.stringify(updated));
            toast.success('Order list deleted');
        }
    };

    const handleEditClick = (list: OrderList, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingList(list);
        setIsCreateOverlayOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-3 min-[340px]:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 min-[340px]:gap-2 min-w-0">
                            <button 
                                onClick={() => router.back()} 
                                className="p-1 min-[340px]:p-2 -ml-1 min-[340px]:-ml-2 hover:bg-gray-50 rounded-full transition-colors shrink-0"
                            >
                                <ChevronLeft size={22} className="text-[#181725]" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-[18px] min-[340px]:text-[20px] md:text-[24px] font-bold text-[#181725] leading-tight truncate">
                                    Quick Order Lists
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button 
                                onClick={() => setIsCreateOverlayOpen(true)}
                                className="flex items-center justify-center bg-[#299e60] text-white w-9 h-9 min-[340px]:w-10 min-[340px]:h-10 sm:w-auto sm:px-4 sm:py-2 rounded-full sm:rounded-xl text-[12px] font-bold shadow-md shadow-green-100/50 hover:bg-[#22844f] transition-all"
                            >
                                <Plus size={18} />
                                <span className="hidden sm:inline ml-1.5">New List</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <CreateListOverlay 
                isOpen={isCreateOverlayOpen}
                onClose={() => {
                    setIsCreateOverlayOpen(false);
                    setEditingList(null);
                }}
                onSave={handleCreateList}
                initialData={editingList}
            />

            {/* Lists */}
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                {allLists.length > 0 ? (
                    <div className="space-y-3">
                        {allLists.map((list) => (
                            <Link
                                key={list.id}
                                href={`/order-lists/${list.id}`}
                                className="flex items-center gap-2 min-[340px]:gap-4 bg-white rounded-2xl p-3 min-[340px]:p-4 border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 transition-all group"
                            >
                                {/* Vendor Logo */}
                                <div className="w-10 h-10 min-[340px]:w-12 min-[340px]:h-12 bg-gray-50 rounded-xl flex items-center justify-center p-1.5 shrink-0 border border-gray-100">
                                    {list.vendorLogo ? (
                                        <img src={list.vendorLogo} alt={list.vendorName} className="w-full h-full object-contain" />
                                    ) : (
                                        <ListOrdered size={20} className="text-gray-400" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[13px] min-[340px]:text-[14px] font-bold text-[#181725] line-clamp-1">{list.name}</p>
                                    </div>
                                    <p className="text-[10px] min-[340px]:text-[11px] text-[#299e60] font-semibold mt-0.5">
                                        {list.vendorName}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 min-[340px]:gap-3 mt-1">
                                        <span className="text-[10px] min-[340px]:text-[11px] text-gray-400 font-medium">
                                            {list.items.length} items
                                        </span>
                                        {list.lastUsed && (
                                            <span className="flex items-center gap-0.5 text-[10px] min-[340px]:text-[11px] text-gray-400 font-medium">
                                                <Clock size={10} />
                                                <span className="whitespace-nowrap">
                                                    Used {new Date(list.lastUsed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 min-[340px]:gap-2 ml-auto shrink-0">
                                    <button 
                                        onClick={(e) => handleEditClick(list, e)}
                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#53B175] transition-all active:scale-95"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteList(list.id, e)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-all active:scale-95"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors ml-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-[48px] mb-3">📋</p>
                        <p className="text-[16px] font-bold text-gray-700">No order lists yet</p>
                        <p className="text-[13px] text-gray-400 mt-1">Create your first list for fast repeat ordering</p>
                        <button 
                            onClick={() => setIsCreateOverlayOpen(true)}
                            className="mt-4 bg-[#299e60] text-white px-6 py-2.5 rounded-xl text-[13px] font-bold shadow-md shadow-green-200/50 hover:bg-[#22844f] transition-all"
                        >
                            Create Order List
                        </button>
                    </div>
                )}
            </div>

            <StickyCartBar />
        </div>
    );
}
