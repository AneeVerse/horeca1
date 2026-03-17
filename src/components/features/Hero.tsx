'use client';

import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ShoppingCart,
    ChevronDown
} from 'lucide-react';

const SLIDES = [
    {
        tag: "🥦 FRESH & HEALTHY",
        title: "Daily Grocery Order and Get Express Delivery",
        image: "/images/hero-right1.png",
        color: "text-[#0f172a]"
    },
    {
        tag: "🍎 100% ORGANIC",
        title: "Fresh Fruits & Vegetables Delivered to Your Door",
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
    const [currentSlide, setCurrentSlide] = useState(0);
    const [animationState, setAnimationState] = useState<'idle' | 'exiting' | 'entering'>('idle');
    const [direction, setDirection] = useState<'left' | 'right'>('left');

    const handleSlideChange = (dir: 'left' | 'right') => {
        if (animationState !== 'idle') return;

        setDirection(dir);
        setAnimationState('exiting');

        setTimeout(() => {
            if (dir === 'left') {
                // Click Left: Next slide
                setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
            } else {
                // Click Right: Prev slide
                setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
            }
            setAnimationState('entering');

            setTimeout(() => {
                setAnimationState('idle');
            }, 400); // Entering duration
        }, 400); // Exiting duration
    };

    // Auto-advance (only for desktop)
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

    return (
        <section className="w-full max-w-full pt-[var(--space-md)] pb-8 md:pb-10 xl:pb-20 relative px-[var(--container-padding)]">
            {/* Main Hero Container */}
            <div className="relative w-full max-w-[var(--container-max)] mx-auto overflow-visible">

                {/* ===== MOBILE HERO (shown only on mobile) ===== */}
                <div className="block md:hidden">
                    <div
                        className="relative w-full rounded-[20px] overflow-hidden"
                        style={{ backgroundColor: '#eff9f0' }}
                    >
                        <div className="flex items-center px-5 py-6">
                            {/* Left Content */}
                            <div className="flex-1 pr-2">
                                <h2 className="text-[0.95rem] font-[family-name:var(--font-inter)] font-[800] text-[#0f172a] leading-[1.25] mb-5 max-w-[260px] tracking-tight">
                                    World Food Festival,<br />
                                    Bring the world to<br />
                                    your Kitchen!
                                </h2>
                                <button className="bg-[#5cb85c] text-white px-5 py-2 rounded-[10px] text-[13px] font-medium transition-all active:scale-95">
                                    Shop Now
                                </button>
                            </div>
                            {/* Right Image */}
                            <div className="flex-shrink-0 w-[40%]">
                                <img
                                    src={MOBILE_HERO.image}
                                    alt="Mobile Hero"
                                    className="w-full h-auto object-contain"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== DESKTOP HERO (hidden on mobile) ===== */}
                <div className="hidden md:block">
                    {/* Hero Background */}
                    <div
                        className="relative w-full min-h-[280px] lg:min-h-[380px] xl:min-h-[clamp(500px,70dvh,820px)] h-auto transition-colors duration-500"
                        style={{
                            backgroundImage: 'url("/images/hero-bg-container.png")',
                            backgroundSize: '100% 100%',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                        }}
                    >

                        <div className="relative z-10 h-full overflow-hidden" style={{ isolation: 'isolate', contain: 'layout style paint' }}>
                            {/* Slide Content Wrapper */}
                            <div className={`grid grid-cols-2 items-center gap-4 lg:gap-6 xl:gap-[var(--space-sm)] px-6 lg:px-10 xl:px-[clamp(1.5rem,5vw,5rem)] pt-10 lg:pt-14 xl:pt-24 pb-10 lg:pb-14 xl:pb-24 h-full min-h-[280px] lg:min-h-[380px] xl:min-h-[clamp(500px,70dvh,820px)] ${getAnimationClass()}`}>

                                {/* Content Left */}
                                <div className="flex flex-col items-start text-left w-full ml-4 lg:ml-6 xl:ml-8">
                                    <span className="bg-white/60 text-primary px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-[11px] lg:text-[13px] xl:text-sm font-bold mb-3 lg:mb-4 xl:mb-6 backdrop-blur-sm border border-white/40">
                                        {SLIDES[currentSlide].tag}
                                    </span>
                                    <h1 className="text-[clamp(1.25rem,3.5vw,2.5rem)] lg:text-[clamp(1.5rem,3vw,2.8rem)] xl:text-[clamp(1.8rem,6vw,4rem)] font-extrabold text-[#0f172a] mb-3 lg:mb-4 xl:mb-[var(--space-md)] leading-[1.1] tracking-tight max-w-[650px]">
                                        {SLIDES[currentSlide].title}
                                    </h1>

                                    <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark transition-all text-white px-4 lg:px-5 xl:px-[clamp(1.2rem,3vw,2.5rem)] py-2 lg:py-2.5 xl:py-[clamp(0.7rem,2vw,1.1rem)] rounded-full text-[13px] lg:text-[14px] xl:text-[clamp(1rem,1.8vw,1.1rem)] font-bold group shadow-xl shadow-primary/25 whitespace-nowrap">
                                        Explore Shop
                                        <ShoppingCart size={18} className="xl:!w-[22px] xl:!h-[22px] group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>

                                <div className="relative flex justify-end items-center w-full lg:mt-4 xl:mt-8 xl:ml-6">
                                    <div className="relative w-full max-w-[clamp(200px,32vw,360px)] lg:max-w-[clamp(250px,35vw,420px)] xl:max-w-[clamp(280px,70vw,600px)] flex items-center justify-center">
                                        <div className="relative z-10">
                                            <img
                                                src={SLIDES[currentSlide].image}
                                                alt="Daily Grocery"
                                                className="w-full h-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.12)] xl:drop-shadow-[0_35px_50px_rgba(0,0,0,0.15)]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Arrows */}
                        <button
                            onClick={() => handleSlideChange('left')}
                            className="flex absolute left-2 lg:left-4 xl:left-6 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md hover:bg-white w-9 h-9 lg:w-11 lg:h-11 xl:w-14 xl:h-14 items-center justify-center rounded-full shadow-lg transition-all text-gray-400 hover:text-primary z-30 group"
                        >
                            <ChevronLeft size={18} className="lg:!w-5 lg:!h-5 xl:!w-7 xl:!h-7 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                            onClick={() => handleSlideChange('right')}
                            className="flex absolute right-2 lg:right-4 xl:right-6 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md hover:bg-white w-9 h-9 lg:w-11 lg:h-11 xl:w-14 xl:h-14 items-center justify-center rounded-full shadow-lg transition-all text-gray-400 hover:text-primary z-30 group"
                        >
                            <ChevronRight size={18} className="lg:!w-5 lg:!h-5 xl:!w-7 xl:!h-7 group-hover:scale-110 transition-transform" />
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

            {/* Floating Scroll Top - Hidden on mobile to avoid conflict with bottom nav */}
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
