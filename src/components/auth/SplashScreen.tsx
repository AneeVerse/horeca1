'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function SplashScreen() {
    const [isVisible, setIsVisible] = useState(false);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        // Check if splash has already been shown in this session
        const hasShownSplash = sessionStorage.getItem('hasShownSplash');

        if (!hasShownSplash) {
            setIsVisible(true);

            // Start fade out after 2 seconds
            const timer = setTimeout(() => {
                setIsFading(true);
            }, 2000);

            // Remove from DOM after fade animation (800ms)
            const removeTimer = setTimeout(() => {
                setIsVisible(false);
                sessionStorage.setItem('hasShownSplash', 'true');
            }, 2800);

            return () => {
                clearTimeout(timer);
                clearTimeout(removeTimer);
            };
        }
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[100000] bg-white transition-opacity duration-800 ease-in-out",
                isFading ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
        >
            <div className="relative w-full h-full">
                <img
                    src="/images/login/Horeca1.png"
                    alt="Splash Screen"
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    );
}
