'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

interface GoogleMapsContextType {
    isLoaded: boolean;
    loadError: string | null;
    google: typeof google | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
    isLoaded: false,
    loadError: null,
    google: null,
});

export function useGoogleMaps() {
    return useContext(GoogleMapsContext);
}

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const loadingRef = useRef(false);

    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            setLoadError('Google Maps API key not configured. Add it to .env.local');
            return;
        }

        if (loadingRef.current || isLoaded) return;
        loadingRef.current = true;

        // Set API options first
        setOptions({
            key: apiKey,
            v: 'weekly',
            libraries: ['places', 'geocoding', 'marker'],
        });

        // Import core library to trigger the actual loading
        importLibrary('core')
            .then(() => {
                setIsLoaded(true);
            })
            .catch((err: Error) => {
                console.error('Google Maps failed to load:', err);
                setLoadError('Failed to load Google Maps');
                loadingRef.current = false;
            });
    }, [isLoaded]);

    // Once loaded, the global `google` namespace is available
    const googleInstance = isLoaded ? (typeof window !== 'undefined' ? window.google : null) : null;

    return (
        <GoogleMapsContext.Provider value={{ isLoaded, loadError, google: googleInstance }}>
            {children}
        </GoogleMapsContext.Provider>
    );
}
