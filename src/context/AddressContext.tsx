'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Address {
    id: string;
    label: 'Home' | 'Work' | 'Other';
    fullAddress: string;
    shortAddress: string;
    latitude: number;
    longitude: number;
    landmark?: string;
    pincode?: string;
    placeId?: string;
    flatInfo?: string; // Flat/Floor/Building
}

interface AddressContextType {
    selectedAddress: Address | null;
    savedAddresses: Address[];
    setSelectedAddress: (address: Address) => void;
    addAddress: (address: Address) => void;
    removeAddress: (id: string) => void;
    updateAddress: (id: string, updates: Partial<Address>) => void;
    detectCurrentLocation: () => Promise<Address | null>;
    isDetectingLocation: boolean;
    reverseGeocode: (lat: number, lng: number) => Promise<Partial<Address> | null>;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

// ─── Storage Keys ────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
    SELECTED: 'horecahub_selected_address',
    SAVED: 'horecahub_saved_addresses',
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function AddressProvider({ children }: { children: React.ReactNode }) {
    const { isLoaded, google } = useGoogleMaps();
    const [selectedAddress, setSelectedAddressState] = useState<Address | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);

    // ─── Load from localStorage on mount ─────────────────────────────────

    useEffect(() => {
        try {
            const savedSelected = localStorage.getItem(STORAGE_KEYS.SELECTED);
            if (savedSelected) {
                setSelectedAddressState(JSON.parse(savedSelected));
            }
            const savedList = localStorage.getItem(STORAGE_KEYS.SAVED);
            if (savedList) {
                setSavedAddresses(JSON.parse(savedList));
            }
        } catch (e) {
            console.warn('Failed to load addresses from localStorage:', e);
        }
    }, []);

    // ─── Persist to localStorage ─────────────────────────────────────────

    const setSelectedAddress = useCallback((address: Address) => {
        setSelectedAddressState(address);
        try {
            localStorage.setItem(STORAGE_KEYS.SELECTED, JSON.stringify(address));
        } catch (e) {
            console.warn('Failed to save selected address:', e);
        }
    }, []);

    const addAddress = useCallback((address: Address) => {
        setSavedAddresses(prev => {
            // Replace if same label already exists
            const filtered = prev.filter(a => !(a.label === address.label && address.label !== 'Other'));
            const updated = [...filtered, address];
            try {
                localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(updated));
            } catch (e) {
                console.warn('Failed to save addresses:', e);
            }
            return updated;
        });
    }, []);

    const removeAddress = useCallback((id: string) => {
        setSavedAddresses(prev => {
            const updated = prev.filter(a => a.id !== id);
            try {
                localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(updated));
            } catch (e) {
                console.warn('Failed to save addresses:', e);
            }
            return updated;
        });
    }, []);

    const updateAddress = useCallback((id: string, updates: Partial<Address>) => {
        setSavedAddresses(prev => {
            const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
            try {
                localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(updated));
            } catch (e) {
                console.warn('Failed to save addresses:', e);
            }
            return updated;
        });
    }, []);

    // ─── Reverse Geocode ─────────────────────────────────────────────────

    const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<Partial<Address> | null> => {
        if (!isLoaded || !google) return null;

        try {
            const geocoder = new google.maps.Geocoder();
            const response = await geocoder.geocode({
                location: { lat, lng },
            });

            if (response.results && response.results.length > 0) {
                const result = response.results[0];
                const components = result.address_components;

                let pincode = '';
                let shortAddr = '';
                const locality = components?.find(c => c.types.includes('locality'));
                const sublocality = components?.find(c => c.types.includes('sublocality_level_1') || c.types.includes('sublocality'));
                const postalCode = components?.find(c => c.types.includes('postal_code'));

                if (postalCode) pincode = postalCode.long_name;
                if (sublocality && locality) {
                    shortAddr = `${sublocality.long_name}, ${locality.long_name}`;
                } else if (locality) {
                    shortAddr = locality.long_name;
                } else {
                    shortAddr = result.formatted_address.split(',').slice(0, 2).join(',');
                }

                return {
                    fullAddress: result.formatted_address,
                    shortAddress: shortAddr,
                    latitude: lat,
                    longitude: lng,
                    pincode,
                    placeId: result.place_id,
                };
            }
            return null;
        } catch (error) {
            console.error('Reverse geocode failed:', error);
            return null;
        }
    }, [isLoaded, google]);

    // ─── Detect Current Location ─────────────────────────────────────────

    const detectCurrentLocation = useCallback(async (): Promise<Address | null> => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return null;
        }

        setIsDetectingLocation(true);

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000,
                });
            });

            const { latitude, longitude } = position.coords;
            const geocoded = await reverseGeocode(latitude, longitude);

            if (geocoded) {
                const address: Address = {
                    id: `current_${Date.now()}`,
                    label: 'Other',
                    fullAddress: geocoded.fullAddress || '',
                    shortAddress: geocoded.shortAddress || '',
                    latitude,
                    longitude,
                    pincode: geocoded.pincode,
                    placeId: geocoded.placeId,
                };
                setSelectedAddress(address);
                setIsDetectingLocation(false);
                return address;
            }

            setIsDetectingLocation(false);
            return null;
        } catch (error: any) {
            setIsDetectingLocation(false);
            if (error.code === 1) {
                alert('Location access denied. Please enable location permissions in your browser settings.');
            } else if (error.code === 2) {
                alert('Unable to determine your location. Please try again.');
            } else if (error.code === 3) {
                alert('Location request timed out. Please try again.');
            }
            console.error('Geolocation error:', error);
            return null;
        }
    }, [reverseGeocode, setSelectedAddress]);

    return (
        <AddressContext.Provider
            value={{
                selectedAddress,
                savedAddresses,
                setSelectedAddress,
                addAddress,
                removeAddress,
                updateAddress,
                detectCurrentLocation,
                isDetectingLocation,
                reverseGeocode,
            }}
        >
            {children}
        </AddressContext.Provider>
    );
}

export function useAddress() {
    const context = useContext(AddressContext);
    if (context === undefined) {
        throw new Error('useAddress must be used within an AddressProvider');
    }
    return context;
}
