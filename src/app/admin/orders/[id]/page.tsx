'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, User, Info, MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const ORDER_DETAILS = {
    id: '#09998',
    date: 'Wed, Aug 13, 2020, 4:34PM',
    customer: {
        name: 'John Alexander',
        email: 'alex@example.com',
        phone: '+998 99 22123456'
    },
    orderInfo: {
        shipping: 'Fargo express',
        payMethod: 'UPI',
        status: 'new'
    },
    deliverTo: {
        city: 'Tashkent, Uzbekistan',
        address: 'Block A, House 123, Floor 2',
        poBox: '10000'
    },
    products: [
        {
            name: 'Amul Butter 100 gms',
            image: '/images/dairy/amul-butter.png',
            unitPrice: 58.50,
            quantity: 2,
            total: 117
        },
        {
            name: 'Tata Salt 1 kg',
            image: '/images/masala-salt/tata-salt.png',
            unitPrice: 30,
            quantity: 1,
            total: 30
        }
    ],
    summary: {
        itemTotal: 147,
        deliveryFee: 15,
        handlingFee: 4,
        grandTotal: 166.00
    }
};

export default function OrderDetailsPage() {
    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Orders Details</h1>
                    <p className="text-[#000000] text-[13px] font-medium opacity-70">Details for Order ID: {ORDER_DETAILS.id}</p>
                </div>

                {/* Search Bar */}
                <div className="relative group w-full max-w-[210px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                    <input
                        type="text"
                        placeholder="search Order ID"
                        className="h-[40px] w-full bg-white border border-[#DCDCDC] rounded-[10px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                    />
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white p-10 md:p-14 rounded-[12px] border border-[#DCDCDC] shadow-sm max-w-[1100px]">
                {/* Order Top Header */}
                <div className="mb-12">
                    <p className="text-[14px] font-medium text-[#7C7C7C] mb-1">{ORDER_DETAILS.date}</p>
                    <p className="text-[14px] font-bold text-[#181725]">Order ID: {ORDER_DETAILS.id}</p>
                </div>

                {/* Info Triple Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
                    {/* Customer */}
                    <div className="flex gap-4">
                        <div className="w-[52px] h-[52px] bg-[#E0E0E0] rounded-full shrink-0"></div>
                        <div className="space-y-1">
                            <h4 className="text-[18px] font-bold text-[#181725]">Customer</h4>
                            <div className="text-[14px] text-[#4B4B4B] font-medium space-y-1 pt-1">
                                <p>{ORDER_DETAILS.customer.name}</p>
                                <p>{ORDER_DETAILS.customer.email}</p>
                                <p>{ORDER_DETAILS.customer.phone}</p>
                            </div>
                        </div>
                    </div>

                    {/* Order Info */}
                    <div className="flex gap-4">
                        <div className="w-[52px] h-[52px] bg-[#E0E0E0] rounded-full shrink-0"></div>
                        <div className="space-y-1">
                            <h4 className="text-[18px] font-bold text-[#181725]">Order info</h4>
                            <div className="text-[14px] text-[#4B4B4B] font-medium space-y-1 pt-1">
                                <p>Shipping: {ORDER_DETAILS.orderInfo.shipping}</p>
                                <p>Pay method: {ORDER_DETAILS.orderInfo.payMethod}</p>
                                <p>Status: {ORDER_DETAILS.orderInfo.status}</p>
                            </div>
                        </div>
                    </div>

                    {/* Deliver to */}
                    <div className="flex gap-4">
                        <div className="w-[52px] h-[52px] bg-[#E0E0E0] rounded-full shrink-0"></div>
                        <div className="space-y-1">
                            <h4 className="text-[18px] font-bold text-[#181725]">Deliver to</h4>
                            <div className="text-[14px] text-[#4B4B4B] font-medium space-y-1 pt-1">
                                <p>City: {ORDER_DETAILS.deliverTo.city}</p>
                                <p>{ORDER_DETAILS.deliverTo.address}</p>
                                <p>Po Box {ORDER_DETAILS.deliverTo.poBox}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Table */}
                <div className="overflow-x-auto mb-10">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="h-[52px] border-b border-[#EEEEEE]">
                                <th className="text-left text-[14px] font-bold text-[#181725] pb-4">Products</th>
                                <th className="text-left text-[14px] font-bold text-[#181725] pb-4">Unit Price</th>
                                <th className="text-center text-[14px] font-bold text-[#181725] pb-4">Quantity</th>
                                <th className="text-right text-[14px] font-bold text-[#181725] pb-4">Total</th>
                            </tr>
                        </thead>
                        <tbody className="">
                            {ORDER_DETAILS.products.map((product, i) => (
                                <tr key={i} className="group">
                                    <td className="py-6 border-t border-[#EEEEEE]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-[60px] h-[60px] shrink-0">
                                                <img src={product.image} alt="" className="w-full h-full object-contain" />
                                            </div>
                                            <span className="text-[15px] font-bold text-[#181725]">{product.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 border-t border-[#EEEEEE] text-[15px] font-bold text-[#181725]">
                                        ₹. {product.unitPrice}
                                    </td>
                                    <td className="py-6 border-t border-[#EEEEEE] text-[15px] font-bold text-[#181725] text-center">
                                        {product.quantity}
                                    </td>
                                    <td className="py-6 border-t border-[#EEEEEE] text-[15px] font-bold text-[#181725] text-right">
                                        ₹. {product.total}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary Section */}
                <div className="border-t border-[#EEEEEE] pt-8 flex justify-end">
                    <div className="w-full max-w-[320px] space-y-3">
                        <div className="flex justify-between text-[14px] font-medium">
                            <span className="text-[#7C7C7C]">Item Total</span>
                            <span className="text-[#181725] font-bold">₹ {ORDER_DETAILS.summary.itemTotal}</span>
                        </div>
                        <div className="flex justify-between text-[14px] font-medium">
                            <span className="text-[#7C7C7C]">Delivery Fee</span>
                            <span className="text-[#181725] font-bold">₹ {ORDER_DETAILS.summary.deliveryFee}</span>
                        </div>
                        <div className="flex justify-between text-[14px] font-medium pb-4 border-b border-dotted border-[#DCDCDC]">
                            <span className="text-[#7C7C7C]">Handling Fee</span>
                            <span className="text-[#181725] font-bold">₹ {ORDER_DETAILS.summary.handlingFee}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-[16px] font-bold text-[#181725]">Grand Total</span>
                            <span className="text-[24px] font-bold text-[#181725]">₹ {ORDER_DETAILS.summary.grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
