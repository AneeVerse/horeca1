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

    return (
        <section className="w-full max-w-full pt-[var(--space-md)] pb-8 md:pb-20 relative px-[var(--container-padding)]">
            {/* Main Hero Container */}
            <div className="relative w-full max-w-[var(--container-max)] mx-auto overflow-visible">

                {/* Hero Background */}
                <div
                    className="relative w-full h-[520px] md:h-[clamp(450px,65dvh,750px)] rounded-[clamp(30px,4vw,60px)] transition-colors duration-500"
                    style={{ backgroundColor: '#d3ebc0' }}
                >
                    {/* Background Pattern Image - Clipped */}
                    <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none">
                        <div
                            className="absolute inset-0 opacity-40 mix-blend-overlay"
                            style={{
                                backgroundImage: 'url("/images/hero-banner-bg.png")',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        />
                    </div>

                    <div className="relative z-10 h-full overflow-hidden" style={{ isolation: 'isolate', contain: 'layout style paint' }}>
                        {/* Slide Content Wrapper */}
                        <div className={`grid grid-cols-1 lg:grid-cols-2 items-center gap-4 md:gap-[var(--space-lg)] px-[clamp(1.5rem,5vw,5rem)] py-8 md:py-20 lg:py-24 h-full ${getAnimationClass()}`}>

                            {/* Content Left */}
                            <div className="flex flex-col items-start text-left w-full order-1">
                                <span className="bg-white/60 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-6 backdrop-blur-sm border border-white/40">
                                    {SLIDES[currentSlide].tag}
                                </span>
                                <h1 className="text-[clamp(1.6rem,5vw,4rem)] font-extrabold text-[#0f172a] mb-4 md:mb-[var(--space-md)] leading-[1.1] tracking-tight max-w-[650px] min-h-[3.5em] md:min-h-0">
                                    {SLIDES[currentSlide].title}
                                </h1>

                                <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark transition-all text-white px-[clamp(1.2rem,3vw,2.5rem)] py-[clamp(0.7rem,2vw,1.1rem)] rounded-full text-[clamp(1rem,1.8vw,1.1rem)] font-bold group shadow-xl shadow-primary/25 whitespace-nowrap">
                                    Explore Shop
                                    <ShoppingCart size={22} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            {/* Image Right */}
                            <div className="relative flex justify-center lg:justify-end order-2 w-full mt-4 lg:mt-0">
                                <div className="relative w-full max-w-[clamp(220px,55vw,600px)] md:max-w-[clamp(280px,70vw,600px)] flex items-center justify-center">
                                    <div className="relative z-10">
                                        <img
                                            src={SLIDES[currentSlide].image}
                                            alt="Daily Grocery"
                                            className="w-full h-auto object-contain drop-shadow-[0_35px_50px_rgba(0,0,0,0.15)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Arrows */}
                    <button
                        onClick={() => handleSlideChange('left')} // Click Left UI button -> logic dir 'left' (Exit Left, Enter Right)
                        className="flex absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md hover:bg-white w-10 h-10 md:w-14 md:h-14 items-center justify-center rounded-full shadow-lg transition-all text-gray-400 hover:text-primary z-30 group"
                    >
                        <ChevronLeft size={24} className="md:w-[28px] md:h-[28px] group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                        onClick={() => handleSlideChange('right')} // Click Right UI button -> logic dir 'right' (Exit Right, Enter Left)
                        className="flex absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md hover:bg-white w-10 h-10 md:w-14 md:h-14 items-center justify-center rounded-full shadow-lg transition-all text-gray-400 hover:text-primary z-30 group"
                    >
                        <ChevronRight size={24} className="md:w-[28px] md:h-[28px] group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                {/* Simplified Scroll Button */}
                <div className="absolute bottom-[-38px] md:bottom-[-44px] left-1/2 -translate-x-1/2 z-50">
                    <div className="w-[76px] h-[76px] md:w-[88px] md:h-[88px] bg-primary rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300 shadow-xl shadow-primary/30 border-[5px] border-white group overflow-hidden"
                        onClick={() => window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' })}>
                        <div className="flex flex-col items-center justify-center animate-bounce-short">
                            <svg width="24" height="34" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                <path d="M12 2V14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />
                                <path d="M6 18L12 24L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M6 26L12 32L18 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
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
