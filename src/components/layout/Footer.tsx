'use client';

import React from 'react';
import Link from 'next/link';
import {
    MapPin,
    Phone,
    Mail,
    Facebook,
    Twitter,
    Instagram,
    Linkedin
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const FOOTER_LINKS = {
    information: [
        'Become a Vendor',
        'Affiliate Program',
        'Privacy Policy',
        'Our Suppliers',
        'Extended Plan',
        'Community'
    ],
    support: [
        'Help Center',
        'Contact Us',
        'Report Abuse',
        'Submit and Dispute',
        'Policies & Rules',
        'Online Shopping'
    ],
    account: [
        'My Account',
        'Order History',
        'Shoping Cart',
        'Compare',
        'Help Ticket',
        'Wishlist'
    ],
    groceries: [
        'Dairy & Eggs',
        'Meat & Seafood',
        'Breakfast Food',
        'Household Supplies',
        'Bread & Bakery',
        'Pantry Staples'
    ]
};

const SOCIAL_LINKS = [
    { icon: Facebook, href: '#' },
    { icon: Twitter, href: '#' },
    { icon: Instagram, href: '#' },
    { icon: Linkedin, href: '#' }
];

export function Footer() {
    const pathname = usePathname();
    const isCartPage = pathname === '/cart';
    const isProductPage = pathname?.startsWith('/product/');

    if (isProductPage) return null;

    return (
        <footer className={cn(
            "w-full bg-white relative overflow-hidden pb-20 md:pb-0",
            isCartPage && "hidden md:block"
        )}>
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] relative z-10">
                {/* Main Footer Section */}
                <div className=" pb-8 md:py-16 flex flex-col lg:flex-row justify-between gap-10 lg:gap-0">

                    {/* Column 1: Logo & Contact */}
                    <div className="w-full lg:w-[28%] space-y-6">
                        <Link href="/" className="inline-block">
                            <img src="/Horeca1.png" alt="Horeca1" className="h-8 md:h-10 w-auto object-contain" />
                        </Link>
                        <p className="text-[14px] text-[#7C7C7C] leading-[1.6] max-w-[320px]">
                            We&apos;re Grocery Shop, an innovative team of food supliers.
                        </p>
                        <ul className="space-y-5 pt-2">
                            <li className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#299E60] flex items-center justify-center shrink-0">
                                    <MapPin size={18} className="text-white" />
                                </div>
                                <span className="text-[14px] text-[#181725] font-medium leading-[1.4] pt-1">
                                    C-003, Sanpada Station Complex,<br />
                                    Navi Mumbai, Maharashtra 400705
                                </span>
                            </li>
                            <li className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#299E60] flex items-center justify-center shrink-0">
                                    <Phone size={18} className="text-white" />
                                </div>
                                <span className="text-[14px] text-[#181725] font-medium">
                                    7710920002
                                </span>
                            </li>
                            <li className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#299E60] flex items-center justify-center shrink-0">
                                    <Mail size={18} className="text-white" />
                                </div>
                                <span className="text-[14px] text-[#181725] font-medium">
                                    sales@horeca1.com
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Links Columns - 2x2 Grid on Mobile, row on Desktop */}
                    <div className="w-full lg:flex-1 grid grid-cols-2 lg:flex lg:flex-row lg:justify-around gap-x-4 gap-y-10 lg:gap-4 lg:px-6">
                        {/* Information */}
                        <div className="min-w-fit">
                            <h4 className="text-[16px] md:text-[18px] font-bold text-[#181725] mb-5">Information</h4>
                            <ul className="space-y-4">
                                {FOOTER_LINKS.information.map((link) => (
                                    <li key={link}>
                                        <Link href="#" className="text-[14px] text-[#7C7C7C] hover:text-[#299E60] transition-colors">
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Customer Support */}
                        <div className="min-w-fit">
                            <h4 className="text-[16px] md:text-[18px] font-bold text-[#181725] mb-5">Customer Support</h4>
                            <ul className="space-y-4">
                                {FOOTER_LINKS.support.map((link) => (
                                    <li key={link}>
                                        <Link href="#" className="text-[14px] text-[#7C7C7C] hover:text-[#299E60] transition-colors">
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* My Account */}
                        <div className="min-w-fit">
                            <h4 className="text-[16px] md:text-[18px] font-bold text-[#181725] mb-5">My Account</h4>
                            <ul className="space-y-4">
                                {FOOTER_LINKS.account.map((link) => (
                                    <li key={link}>
                                        <Link href="#" className="text-[14px] text-[#7C7C7C] hover:text-[#299E60] transition-colors">
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Daily Groceries */}
                        <div className="min-w-fit">
                            <h4 className="text-[16px] md:text-[18px] font-bold text-[#181725] mb-5">Daily Groceries</h4>
                            <ul className="space-y-4">
                                {FOOTER_LINKS.groceries.map((link) => (
                                    <li key={link}>
                                        <Link href="#" className="text-[14px] text-[#7C7C7C] hover:text-[#299E60] transition-colors">
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Shop on The Go + Social Links */}
                <div className="pb-10 md:pb-16 border-t border-gray-100 pt-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                        <div>
                            <h4 className="text-[16px] md:text-[18px] font-bold text-[#181725] mb-3">Shop on The Go</h4>
                            <p className="text-[14px] text-[#7C7C7C]">
                                Marketpro App is available. Get it now
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {SOCIAL_LINKS.map((social, idx) => (
                                <Link
                                    key={idx}
                                    href={social.href}
                                    className="w-11 h-11 rounded-full bg-[#D3F2E0] text-[#299E60] flex items-center justify-center hover:bg-[#299E60] hover:text-white transition-all"
                                >
                                    <social.icon size={18} />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Bar - Commented out as requested */}
                {/* 
                <div className="py-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[14px] text-[#7C7C7C] text-center md:text-left">
                        Horeca1 eCommerce © 2025. All Rights Reserved
                    </p>
                    <div className="flex items-center gap-4">
                        <span className="text-[14px] text-[#7C7C7C] font-medium">We Are Accepting</span>
                        <img
                            src="/images/recom-product/MarketPro - eCommerce Multivendor Tailwind CSS Template Multipurpose Preview - ThemeForest_files/payment-method.png"
                            alt="Accepted Payments"
                            className="h-8 object-contain"
                        />
                    </div>
                </div>
                */}
            </div>
        </footer>
    );
}
