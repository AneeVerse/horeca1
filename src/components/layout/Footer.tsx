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

    return (
        <footer className={cn(
            "w-full bg-[#f8fff8] border-t border-[#e8f5e9] relative overflow-hidden pb-20 md:pb-0",
            isCartPage && "hidden md:block"
        )}>
            {/* Faint Background Pattern */}
            <div
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                    backgroundImage: 'url("/images/recom-product/MarketPro - eCommerce Multivendor Tailwind CSS Template Multipurpose Preview - ThemeForest_files/body-bottom-bg.png")',
                    backgroundRepeat: 'repeat',
                    backgroundSize: '800px'
                }}
            />

            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] relative z-10">
                {/* Main Footer Links Section */}
                <div className="pt-0 pb-12 md:py-16 flex flex-col lg:flex-row justify-between gap-10 lg:gap-0">

                    {/* Column 1: Logo & Contact */}
                    <div className="w-full lg:w-[28%] space-y-6">
                        <Link href="/" className="inline-block">
                            <img
                                src="/images/recom-product/MarketPro - eCommerce Multivendor Tailwind CSS Template Multipurpose Preview - ThemeForest_files/logo.png"
                                alt="Marketpro"
                                className="h-10 md:h-12 object-contain"
                            />
                        </Link>
                        <p className="text-[14px] text-text-muted leading-relaxed max-w-[320px]">
                            We&apos;re Grocery Shop, an innovative team of food supliers.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#2ca36a] flex items-center justify-center shrink-0">
                                    <MapPin size={18} className="text-white" />
                                </div>
                                <span className="text-[14px] text-text font-medium leading-[1.4] pt-0.5">
                                    789 Inner Lane, Biyes park, California, USA
                                </span>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#2ca36a] flex items-center justify-center shrink-0">
                                    <Phone size={18} className="text-white" />
                                </div>
                                <div className="text-[14px] text-text font-medium">
                                    <div className="mb-1">+00 123 456 789 <span className="text-primary font-bold ml-1">or</span></div>
                                    <div>+00 987 654 012</div>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#2ca36a] flex items-center justify-center shrink-0">
                                    <Mail size={18} className="text-white" />
                                </div>
                                <span className="text-[14px] text-text font-medium pt-2">
                                    support24@marketpro.com
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Links Columns - 2x2 Grid on Mobile */}
                    <div className="w-full lg:flex-1 grid grid-cols-2 lg:flex lg:flex-row lg:justify-around gap-x-4 gap-y-10 lg:gap-4 lg:px-6">
                        {/* Information */}
                        <div className="min-w-fit">
                            <h4 className="text-[16px] md:text-[18px] font-bold text-text mb-6">Information</h4>
                            <ul className="space-y-3">
                                {FOOTER_LINKS.information.map((link) => (
                                    <li key={link}>
                                        <Link href="#" className="text-[14px] text-text-muted hover:text-primary transition-colors">
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Customer Support */}
                        <div className="min-w-fit">
                            <h4 className="text-[16px] md:text-[18px] font-bold text-text mb-6">Customer Support</h4>
                            <ul className="space-y-3">
                                {FOOTER_LINKS.support.map((link) => (
                                    <li key={link}>
                                        <Link href="#" className="text-[14px] text-text-muted hover:text-primary transition-colors">
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* My Account */}
                        <div className="min-w-fit">
                            <h4 className="text-[16px] md:text-[18px] font-bold text-text mb-6">My Account</h4>
                            <ul className="space-y-3">
                                {FOOTER_LINKS.account.map((link) => (
                                    <li key={link}>
                                        <Link href="#" className="text-[14px] text-text-muted hover:text-primary transition-colors">
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Daily Groceries */}
                        <div className="min-w-fit">
                            <h4 className="text-[16px] md:text-[18px] font-bold text-text mb-6">Daily Groceries</h4>
                            <ul className="space-y-3">
                                {FOOTER_LINKS.groceries.map((link) => (
                                    <li key={link}>
                                        <Link href="#" className="text-[14px] text-text-muted hover:text-primary transition-colors">
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Column 6: Shop on The Go */}
                    <div className="w-full lg:w-auto space-y-6">
                        <h4 className="text-[16px] md:text-[18px] font-bold text-text mb-6">Shop on The Go</h4>
                        <p className="text-[14px] text-text-muted leading-relaxed">
                            Marketpro App is available. Get it now
                        </p>
                        <div className="flex flex-row flex-wrap lg:flex-col gap-3">
                            <Link href="#" className="inline-block transition-transform hover:scale-105 shrink-0">
                                <img
                                    src="/images/recom-product/MarketPro - eCommerce Multivendor Tailwind CSS Template Multipurpose Preview - ThemeForest_files/store-img1.png"
                                    alt="App Store"
                                    className="h-11 w-auto object-contain bg-black rounded-lg"
                                />
                            </Link>
                            <Link href="#" className="inline-block transition-transform hover:scale-105 shrink-0">
                                <img
                                    src="/images/recom-product/MarketPro - eCommerce Multivendor Tailwind CSS Template Multipurpose Preview - ThemeForest_files/store-img2.png"
                                    alt="Google Play"
                                    className="h-11 w-auto object-contain bg-black rounded-lg"
                                />
                            </Link>
                        </div>
                        <div className="pt-4 flex items-center gap-3">
                            {SOCIAL_LINKS.map((social, idx) => (
                                <Link
                                    key={idx}
                                    href={social.href}
                                    className="w-10 h-10 rounded-full bg-[#dceddc] text-[#2ca36a] flex items-center justify-center hover:bg-[#2ca36a] hover:text-white transition-all shadow-sm"
                                >
                                    <social.icon size={18} />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="py-6 border-t border-[#e8f5e9] flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
                    <p className="text-[14px] text-text-muted text-center md:text-left">
                        Marketpro eCommerce © 2024. All Rights Reserved
                    </p>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <span className="text-[14px] text-text-muted font-medium">We Are Accepting</span>
                        <img
                            src="/images/recom-product/MarketPro - eCommerce Multivendor Tailwind CSS Template Multipurpose Preview - ThemeForest_files/payment-method.png"
                            alt="Accepted Payments"
                            className="h-8 object-contain"
                        />
                    </div>
                </div>
            </div>
        </footer>
    );
}
