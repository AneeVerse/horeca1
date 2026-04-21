'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import {
    ChevronLeft,
    ChevronRight,
    ShoppingCart,
} from 'lucide-react';

const SLIDES = [
    {
        tag: "🔥 BEST OFFERS",
        title: "Turn up the flavour",
        description: "sauces, spreads, seasonings & more at bulk prices",
        image: "/images/hero-right1.png",
        color: "text-[#0f172a]"
    },
    {
        tag: "🥦 FRESH & HEALTHY",
        title: "Daily Grocery Order",
        description: "Get Express Delivery on all fresh items every day",
        image: "/images/hero-right1.png",
        color: "text-[#0f172a]"
    },
    {
        tag: "🍎 100% ORGANIC",
        title: "Fresh Essentials",
        description: "Fruits & Vegetables Delivered to Your Doorstep",
        image: "/images/hero-right3.png",
        color: "text-[#0f172a]"
    }
];

// Mobile Hero Data
const MOBILE_HERO = {
    title: "World Food Festival, Bring the world to your Kitchen!",
    image: "/images/mobile-hero-right.png"
};

export function Hero() {
    const { status } = useSession();
    const _isAuthenticated = status === 'authenticated'; // reserved for future use

    const [currentSlide, setCurrentSlide] = useState(0);
    const [animationState, setAnimationState] = useState<'idle' | 'exiting' | 'entering'>('idle');
    const [direction, setDirection] = useState<'left' | 'right'>('left');

    const handleSlideChange = (dir: 'left' | 'right') => {
        if (animationState !== 'idle') return;

        setDirection(dir);
        setAnimationState('exiting');

        setTimeout(() => {
            if (dir === 'left') {
                setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
            } else {
                setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
            }
            setAnimationState('entering');

            setTimeout(() => {
                setAnimationState('idle');
            }, 400);
        }, 400);
    };

    // Auto-advance
    useEffect(() => {
        const timer = setInterval(() => handleSlideChange('left'), 8000);
        return () => clearInterval(timer);
    }, [animationState]);

    const getAnimationClass = () => {
        if (animationState === 'exiting') {
            return direction === 'left' ? 'animate-slide-out-left' : 'animate-slide-out-right';
        }
        if (animationState === 'entering') {
            return direction === 'left' ? 'animate-slide-in-right' : 'animate-slide-in-left';
        }
        return '';
    };

    // === DEFAULT BANNER (compact dark-green, shown for everyone) ===
    return (
        <section className="w-full max-w-full pt-[var(--space-md)] pb-8 relative px-[var(--container-padding)]">
            <div className="relative w-full max-w-[var(--container-max)] mx-auto">
                <div className="hidden md:block">
                    <div className="relative w-full h-[180px] lg:h-[220px] rounded-[32px] md:rounded-[40px] overflow-hidden bg-gradient-to-r from-[#22844f] via-[#299e60] to-[#22c55e] flex items-center px-6 md:px-10 lg:px-20 shadow-lg">
                        <div className="absolute left-0 top-0 w-full h-full opacity-10 pointer-events-none">
                            <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="10%" cy="50%" r="150" stroke="white" strokeWidth="2" />
                                <circle cx="90%" cy="20%" r="80" stroke="white" strokeWidth="2" />
                            </svg>
                        </div>
                        <div className={`flex items-center w-full transition-all duration-300 ${getAnimationClass()}`}>
                            <div className="flex-shrink-0 mr-4 md:mr-8 lg:mr-16 translate-y-2 relative z-10">
                                <Image src={SLIDES[currentSlide].image} alt={SLIDES[currentSlide].title} width={200} height={200} className="h-[120px] md:h-[140px] lg:h-[200px] w-auto object-contain drop-shadow-2xl brightness-110 mt-2" priority />
                            </div>
                            <div className="flex-grow flex flex-col items-start justify-center text-white relative z-10">
                                <h1 className="text-[1.8rem] md:text-[2.2rem] lg:text-[3rem] font-[900] leading-[1.1] tracking-tight drop-shadow-md">{SLIDES[currentSlide].title}</h1>
                                <p className="text-[0.8rem] md:text-[0.95rem] lg:text-[1.1rem] font-medium opacity-90 max-w-[500px] mt-1">{SLIDES[currentSlide].description}</p>
                            </div>
                            <div className="flex-shrink-0 ml-4 relative z-10">
                                <button className="bg-[#181725] text-white px-5 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 text-[0.9rem] md:text-[1.1rem] font-bold hover:scale-105 transition-all shadow-xl whitespace-nowrap">
                                    Shop here
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                                </button>
                            </div>
                        </div>
                        <button onClick={() => handleSlideChange('left')} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 bg-white/90 rounded-full flex items-center justify-center text-[#299e60] shadow-md hover:scale-110 hover:bg-white transition-all border border-green-100 z-20"><ChevronLeft size={24} strokeWidth={3} /></button>
                        <button onClick={() => handleSlideChange('right')} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 bg-white/90 rounded-full flex items-center justify-center text-[#299e60] shadow-md hover:scale-110 hover:bg-white transition-all border border-green-100 z-20"><ChevronRight size={24} strokeWidth={3} /></button>
                    </div>
                </div>
                <div className="md:hidden">
                    <div className="relative w-full rounded-[20px] overflow-hidden" style={{ backgroundColor: '#eff9f0' }}>
                        <div className="flex items-center px-5 py-6">
                            <div className="flex-1 pr-2">
                                <h2 className="text-[0.95rem] font-[800] text-[#0f172a] leading-[1.25] mb-5 max-w-[260px]">{MOBILE_HERO.title}</h2>
                                <button className="bg-[#5cb85c] text-white px-5 py-2 rounded-[10px] text-[13px] font-medium transition-all active:scale-95">Shop Now</button>
                            </div>
                            <div className="flex-shrink-0 w-[40%] relative h-[120px]">
                                <Image src={MOBILE_HERO.image} alt="Mobile Hero" fill className="object-contain" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );

    // === LARGE GUEST HERO SLIDER — kept below as dead code (unreachable after return above) ===
    // To restore: remove the return block above and uncomment this one
    // eslint-disable-next-line no-unreachable
    return (
        <section className="w-full max-w-full pt-[var(--space-md)] pb-8 md:pb-10 xl:pb-20 relative px-[var(--container-padding)]">
            <div className="relative w-full max-w-[var(--container-max)] mx-auto overflow-visible">

                {/* Mobile View */}
                <div className="block md:hidden">
                    <div
                        className="relative w-full rounded-[20px] overflow-hidden"
                        style={{ backgroundColor: '#eff9f0' }}
                    >
                        <div className="flex items-center px-5 py-6">
                            <div className="flex-1 pr-2">
                                <h2 className="text-[0.95rem] font-[800] text-[#0f172a] leading-[1.25] mb-5 max-w-[260px]">
                                    {MOBILE_HERO.title}
                                </h2>
                                <button className="bg-[#5cb85c] text-white px-5 py-2 rounded-[10px] text-[13px] font-medium transition-all active:scale-95">
                                    Shop Now
                                </button>
                            </div>
                            <div className="flex-shrink-0 w-[40%] relative h-[120px]">
                                <Image src={MOBILE_HERO.image} alt="Mobile Hero" fill className="object-contain" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hidden md:block">
                    <div
                        className="relative w-full min-h-[280px] lg:min-h-[380px] xl:min-h-[clamp(500px,70dvh,820px)] h-auto transition-colors duration-500"
                        style={{
                            backgroundImage: 'url("/images/hero-bg-container.png")',
                            backgroundSize: '100% 100%',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                        }}
                    >
                        <div className="relative z-10 h-full overflow-hidden" style={{ isolation: 'isolate' }}>
                            <div className={`grid grid-cols-2 items-center gap-4 lg:gap-6 xl:gap-[var(--space-sm)] px-6 lg:px-10 xl:px-[clamp(1.5rem,5vw,5rem)] pt-10 lg:pt-14 xl:pt-24 pb-10 lg:pb-14 xl:pb-24 h-full min-h-[280px] lg:min-h-[380px] xl:min-h-[clamp(500px,70dvh,820px)] ${getAnimationClass()}`}>
                                <div className="flex flex-col items-start text-left w-full ml-4 lg:ml-6 xl:ml-8">
                                    <span className="bg-white/60 text-primary px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-[11px] lg:text-[13px] xl:text-sm font-bold mb-3 lg:mb-4 xl:mb-6 backdrop-blur-sm border border-white/40">
                                        {SLIDES[currentSlide].tag}
                                    </span>
                                    <h1 className="text-[clamp(1.25rem,3.5vw,2.5rem)] lg:text-[clamp(1.5rem,3vw,2.8rem)] xl:text-[clamp(1.8rem,6vw,4rem)] font-extrabold text-[#0f172a] mb-3 lg:mb-4 xl:mb-[var(--space-md)] leading-[1.1] tracking-tight max-w-[650px]">
                                        {SLIDES[currentSlide].title}
                                    </h1>
                                    <p className="text-[clamp(0.9rem,1.2vw,1.1rem)] font-medium text-gray-500 mb-6 max-w-[450px]">
                                        {SLIDES[currentSlide].description}
                                    </p>
                                    <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark transition-all text-white px-4 lg:px-5 xl:px-[clamp(1.2rem,3vw,2.5rem)] py-2 lg:py-2.5 xl:py-[clamp(0.7rem,2vw,1.1rem)] rounded-full text-[13px] lg:text-[14px] xl:text-[clamp(1rem,1.8vw,1.1rem)] font-bold group shadow-xl shadow-primary/25 whitespace-nowrap">
                                        Explore Shop
                                        <ShoppingCart size={18} />
                                    </button>
                                </div>
                                <div className="relative flex justify-end items-center w-full lg:mt-4 xl:mt-8 xl:ml-6">
                                    <div className="relative w-full max-w-[clamp(200px,32vw,360px)] lg:max-w-[clamp(250px,35vw,420px)] xl:max-w-[clamp(280px,70vw,600px)] aspect-square">
                                        <Image src={SLIDES[currentSlide].image} fill className="object-contain drop-shadow-xl" alt="Hero" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => handleSlideChange('left')} className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 bg-white/90 w-9 h-9 lg:w-11 lg:h-11 flex items-center justify-center rounded-full shadow-lg text-gray-400 hover:text-primary z-30">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={() => handleSlideChange('right')} className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 bg-white/90 w-9 h-9 lg:w-11 lg:h-11 flex items-center justify-center rounded-full shadow-lg text-gray-400 hover:text-primary z-30">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Simplified Scroll Button */}
                    <div className="absolute bottom-[12px] lg:bottom-[16px] xl:bottom-[20px] left-1/2 -translate-x-1/2 z-50">
                        <div className="w-[60px] h-[60px] lg:w-[75px] lg:h-[75px] xl:w-[100px] xl:h-[100px] bg-primary rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300 shadow-xl shadow-primary/30 border-2 xl:border-[3px] border-white group overflow-hidden"
                            onClick={() => window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' })}>
                            <div className="flex flex-col items-center justify-center animate-bounce-short">
                                <svg width="16" height="22" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white lg:w-5 lg:h-7 xl:w-6 xl:h-[34px]">
                                    <path d="M12 2V14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />
                                    <path d="M6 18L12 24L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M6 26L12 32L18 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Scroll Top */}
            <div
                className="hidden md:flex fixed bottom-6 right-6 w-12 h-12 border border-gray-200 bg-white rounded-full items-center justify-center text-primary cursor-pointer hover:bg-primary-light transition-all shadow-xl z-50 group hover:-translate-y-1"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
                <svg width="24" height="24" className="group-hover:animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
            </div>
        </section>
    );
}
