'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlashSaleItem {
    title: string;
    image: string;
    bgPattern: string;
    bgColor: string;
    targetDate: Date;
}

const FLASH_SALES: FlashSaleItem[] = [
    {
        title: 'Daily Snacks',
        image: '/images/flash-sale/flash-right1 (1).png',
        bgPattern: '/images/flash-sale/flash-sale-bg1.png',
        bgColor: '#e8f9e9',
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
    },
    {
        title: 'Fresh Vegetables',
        image: '/images/flash-sale/flash-right1 (2).png',
        bgPattern: '/images/flash-sale/flash-sale-bg2.png',
        bgColor: '#f9eae3',
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)
    },
    // Repeated for carousel demonstration
    {
        title: 'Organic Fruits',
        image: '/images/flash-sale/flash-right1 (1).png',
        bgPattern: '/images/flash-sale/flash-sale-bg1.png',
        bgColor: '#e8f9e9',
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2)
    },
    {
        title: 'Dairy Delights',
        image: '/images/flash-sale/flash-right1 (2).png',
        bgPattern: '/images/flash-sale/flash-sale-bg2.png',
        bgColor: '#f9eae3',
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4)
    },
    {
        title: 'Natural Juices',
        image: '/images/flash-sale/flash-right1 (1).png',
        bgPattern: '/images/flash-sale/flash-sale-bg1.png',
        bgColor: '#e8f9e9',
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1)
    },
    {
        title: 'Healthy Seafood',
        image: '/images/flash-sale/flash-right1 (2).png',
        bgPattern: '/images/flash-sale/flash-sale-bg2.png',
        bgColor: '#f9eae3',
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6)
    }
];

function CountdownTimer({ targetDate }: { targetDate: Date }) {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +targetDate - +new Date();
            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            }
        };

        const timer = setInterval(calculateTimeLeft, 1000);
        calculateTimeLeft();
        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div className="flex gap-1.5 md:gap-2">
            {[
                { label: 'Days', value: timeLeft.days, hideMobile: false },
                { label: 'Hours', value: timeLeft.hours, hideMobile: false },
                { label: 'Min', value: timeLeft.minutes, hideMobile: false },
                { label: 'Sec', value: timeLeft.seconds, hideMobile: true }
            ].map((unit, idx) => (
                <div
                    key={unit.label}
                    className={cn(
                        "flex flex-col items-center bg-white rounded-lg py-1 px-1.5 md:py-1.5 md:px-3 min-w-[40px] xs:min-w-[45px] md:min-w-[60px] shadow-sm",
                        unit.hideMobile && "hidden md:flex"
                    )}
                >
                    <span className="text-[12px] md:text-[16px] font-bold text-text leading-none">{unit.value}</span>
                    <span className="text-[7px] md:text-[10px] text-text-muted font-medium uppercase tracking-tight">{unit.label}</span>
                </div>
            ))}
        </div>
    );
}

export function FlashSale() {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const scrollAmount = container.clientWidth >= 1024 ? container.clientWidth / 2 : container.clientWidth;
            container.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section className="w-full pb-12 md:pb-16 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[20px] md:text-[28px] font-bold text-text">Flash Sales Today</h2>
                    <div className="flex items-center gap-4">
                        <Link href="/shop" className="hidden sm:block text-[14px] font-bold text-text-muted hover:text-primary transition-colors">
                            View All Deals
                        </Link>
                        <div className="flex gap-2">
                            <button
                                onClick={() => scroll('left')}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-100 flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/20 transition-all bg-white shadow-sm"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => scroll('right')}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-100 flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/20 transition-all bg-white shadow-sm"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Carousel Container */}
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-4 md:gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth"
                >
                    {FLASH_SALES.map((sale, idx) => (
                        <div
                            key={idx}
                            className="relative flex-none w-[280px] xs:w-[320px] sm:w-[480px] lg:w-[calc(50%-12px)] h-[220px] sm:h-[260px] lg:h-[280px] rounded-[24px] overflow-hidden p-4 sm:p-6 md:p-8 flex items-center gap-3 md:gap-8 group bg-cover bg-center bg-no-repeat snap-start"
                            style={{ backgroundImage: `url(${sale.bgPattern})` }}
                        >
                            {/* Product Image */}
                            <div className="relative z-10 w-[100px] xs:w-[120px] sm:w-[180px] md:w-[220px] lg:w-[240px] flex-shrink-0 transition-transform duration-500 group-hover:scale-105">
                                <img
                                    src={sale.image}
                                    alt={sale.title}
                                    className="w-full h-full object-contain drop-shadow-2xl"
                                />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-start gap-2 sm:gap-4 flex-1">
                                <h3 className="text-[16px] xs:text-[18px] sm:text-[24px] md:text-[28px] font-bold text-text leading-tight whitespace-nowrap">
                                    {sale.title}
                                </h3>

                                <CountdownTimer targetDate={sale.targetDate} />

                                <Link
                                    href="/shop"
                                    className="group flex items-center gap-1.5 xs:gap-2 bg-primary hover:bg-primary-dark text-white px-4 xs:px-6 sm:px-8 py-2 md:py-3 rounded-lg text-[12px] sm:text-sm font-bold transition-all shadow-lg hover:shadow-primary/30 mt-1 whitespace-nowrap"
                                >
                                    Shop Now
                                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </section>
    );
}
