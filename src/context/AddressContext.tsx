'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Address {
    id: string;
    label: string;
    businessName?: string;  // Auto-filled from Google Places (restaurant/hotel/cafe name)
    fullAddress: string;
    shortAddress: string;
    latitude: number;
    longitude: number;
    flatInfo?: string;
    landmark?: string;
    pincode?: string;
    city?: string;
    state?: string;
    placeId?: string;
    isDefault?: boolean;
}

interface AddressContextType {
    selectedAddress: Address | null;
    savedAddresses: Address[];
    isLoadingAddresses: boolean;
    setSelectedAddress: (address: Address | null) => void;
    addAddress: (address: Omit<Address, 'id'>) => Promise<Address | null>;
    removeAddress: (id: string) => Promise<void>;
    updateAddress: (id: string, updates: Partial<Address>) => Promise<void>;
    detectCurrentLocation: () => Promise<Address | null>;
    isDetectingLocation: boolean;
    reverseGeocode: (lat: number, lng: number) => Promise<Partial<Address> | null>;
    refreshAddresses: () => Promise<void>;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

// ─── Storage Keys (localStorage fallback for unauthenticated) ────────────────

const STORAGE_KEYS = {
    SELECTED: 'horecahub_selected_address',
    SAVED: 'horecahub_saved_addresses',
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function AddressProvider({ children }: { children: React.ReactNode }) {
    const { isLoaded, google } = useGoogleMaps();
    const { data: session, status } = useSession();
    const [selectedAddress, setSelectedAddressState] = useState<Address | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

    // ─── DB Sync Helpers ─────────────────────────────────────────────────

    const fetchAddressesFromDB = useCallback(async (): Promise<Address[]> => {
        try {
            const res = await fetch('/api/v1/addresses');
            if (!res.ok) return [];
            const json = await res.json();
            return (json.data || []).map((a: any): Address => ({
                id: a.id,
                label: a.label,
                businessName: a.businessName ?? undefined,
                fullAddress: a.fullAddress,
                shortAddress: a.shortAddress ?? undefined,
                latitude: a.latitude,
                longitude: a.longitude,
                flatInfo: a.flatInfo ?? undefined,
                landmark: a.landmark ?? undefined,
                pincode: a.pincode ?? undefined,
                city: a.city ?? undefined,
                state: a.state ?? undefined,
                placeId: a.placeId ?? undefined,
                isDefault: a.isDefault,
            }));
        } catch {
            return [];
        }
    }, []);

    // ─── Load addresses on mount / session change ────────────────────────

    useEffect(() => {
        // Always load selected address from localStorage (quick, no network)
        try {
            const savedSelected = localStorage.getItem(STORAGE_KEYS.SELECTED);
            if (savedSelected) setSelectedAddressState(JSON.parse(savedSelected));
        } catch { /* ignore */ }

        if (status === 'authenticated') {
            // Load saved addresses from DB
            setIsLoadingAddresses(true);
            fetchAddressesFromDB().then((addresses) => {
                setSavedAddresses(addresses);
                setIsLoadingAddresses(false);
                // If we have a default address and no selected one, use it
                const defaultAddr = addresses.find(a => a.isDefault);
                if (defaultAddr) {
                    setSelectedAddressState(prev => {
                        if (!prev) {
                            try { localStorage.setItem(STORAGE_KEYS.SELECTED, JSON.stringify(defaultAddr)); } catch { /* ignore */ }
                            return defaultAddr;
                        }
                        return prev;
                    });
                }
            });
        } else if (status === 'unauthenticated') {
            // Fallback: load from localStorage
            try {
                const savedList = localStorage.getItem(STORAGE_KEYS.SAVED);
                if (savedList) setSavedAddresses(JSON.parse(savedList));
            } catch { /* ignore */ }
        }
    }, [status, fetchAddressesFromDB]);

    // ─── refreshAddresses ────────────────────────────────────────────────

    const refreshAddresses = useCallback(async () => {
        if (status !== 'authenticated') return;
        const addresses = await fetchAddressesFromDB();
        setSavedAddresses(addresses);
    }, [status, fetchAddressesFromDB]);

    // ─── setSelectedAddress ──────────────────────────────────────────────

    const setSelectedAddress = useCallback((address: Address | null) => {
        setSelectedAddressState(address);
        try {
            if (address) {
                localStorage.setItem(STORAGE_KEYS.SELECTED, JSON.stringify(address));
            } else {
                localStorage.removeItem(STORAGE_KEYS.SELECTED);
            }
        } catch { /* ignore */ }
    }, []);

    // ─── addAddress ──────────────────────────────────────────────────────

    const addAddress = useCallback(async (address: Omit<Address, 'id'>): Promise<Address | null> => {
        if (status === 'authenticated') {
            try {
                const res = await fetch('/api/v1/addresses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        label: address.label,
                        businessName: address.businessName,
                        fullAddress: address.fullAddress,
                        shortAddress: address.shortAddress,
                        flatInfo: address.flatInfo,
                        landmark: address.landmark,
                        pincode: address.pincode,
                        city: address.city,
                        state: address.state,
                        latitude: address.latitude,
                        longitude: address.longitude,
                        placeId: address.placeId,
                        isDefault: address.isDefault ?? false,
                    }),
                });
                if (!res.ok) {
                    toast.error('Failed to save address');
                    return null;
                }
                const json = await res.json();
                const saved: Address = {
                    id: json.data.id,
                    label: json.data.label,
                    businessName: json.data.businessName ?? undefined,
                    fullAddress: json.data.fullAddress,
                    shortAddress: json.data.shortAddress ?? undefined,
                    latitude: json.data.latitude,
                    longitude: json.data.longitude,
                    flatInfo: json.data.flatInfo ?? undefined,
                    landmark: json.data.landmark ?? undefined,
                    pincode: json.data.pincode ?? undefined,
                    city: json.data.city ?? undefined,
                    state: json.data.state ?? undefined,
                    placeId: json.data.placeId ?? undefined,
                    isDefault: json.data.isDefault,
                };
                setSavedAddresses(prev => {
                    const filtered = address.isDefault ? prev.map(a => ({ ...a, isDefault: false })) : prev;
                    return [saved, ...filtered];
                });
                return saved;
            } catch {
                toast.error('Failed to save address');
                return null;
            }
        } else {
            // localStorage fallback for unauthenticated users
            const newAddr: Address = { ...address, id: `addr_${Date.now()}` };
            setSavedAddresses(prev => {
                const updated = [...prev, newAddr];
                try { localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(updated)); } catch { /* ignore */ }
                return updated;
            });
            return newAddr;
        }
    }, [status]);

    // ─── removeAddress ───────────────────────────────────────────────────

    const removeAddress = useCallback(async (id: string): Promise<void> => {
        if (status === 'authenticated') {
            await fetch(`/api/v1/addresses/${id}`, { method: 'DELETE' });
        }
        setSavedAddresses(prev => {
            const updated = prev.filter(a => a.id !== id);
            if (status !== 'authenticated') {
                try { localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(updated)); } catch { /* ignore */ }
            }
            return updated;
        });
        // If the removed address was selected, clear it
        setSelectedAddressState(prev => {
            if (prev?.id === id) {
                try { localStorage.removeItem(STORAGE_KEYS.SELECTED); } catch { /* ignore */ }
                return null;
            }
            return prev;
        });
    }, [status]);

    // ─── updateAddress ───────────────────────────────────────────────────

    const updateAddress = useCallback(async (id: string, updates: Partial<Address>): Promise<void> => {
        if (status === 'authenticated') {
            await fetch(`/api/v1/addresses/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
        }
        setSavedAddresses(prev => {
            const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
            if (status !== 'authenticated') {
                try { localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(updated)); } catch { /* ignore */ }
            }
            return updated;
        });
    }, [status]);

    // ─── Reverse Geocode ─────────────────────────────────────────────────

    const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<Partial<Address> | null> => {
        if (!isLoaded || !google) return null;

        try {
            const geocoder = new google.maps.Geocoder();
            const response = await geocoder.geocode({ location: { lat, lng } });

            if (response.results && response.results.length > 0) {
                const result = response.results[0];
                const components = result.address_components;

                const locality = components?.find(c => c.types.includes('locality'));
                const sublocality = components?.find(c =>
                    c.types.includes('sublocality_level_1') || c.types.includes('sublocality')
                );
                const postalCode = components?.find(c => c.types.includes('postal_code'));
                const stateComp = components?.find(c => c.types.includes('administrative_area_level_1'));

                const pincode = postalCode?.long_name || '';
                const city = locality?.long_name || '';
                const state = stateComp?.long_name || '';
                let shortAddr = '';
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
                    city,
                    state,
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
            toast.error('Geolocation is not supported by your browser');
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
                    city: geocoded.city,
                    state: geocoded.state,
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
                toast.error('Location access denied. Enable location permissions in your browser settings.');
            } else if (error.code === 2) {
                toast.error('Unable to determine your location. Please try again.');
            } else if (error.code === 3) {
                toast.error('Location request timed out. Please try again.');
            }
            return null;
        }
    }, [reverseGeocode, setSelectedAddress]);

    return (
        <AddressContext.Provider
            value={{
                selectedAddress,
                savedAddresses,
                isLoadingAddresses,
                setSelectedAddress,
                addAddress,
                removeAddress,
                updateAddress,
                detectCurrentLocation,
                isDetectingLocation,
                reverseGeocode,
                refreshAddresses,
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
