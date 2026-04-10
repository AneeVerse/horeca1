'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider';

export interface PlacePrediction {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
}

export interface PlaceDetails {
    placeId: string;
    fullAddress: string;
    shortAddress: string;
    latitude: number;
    longitude: number;
    pincode?: string;
    city?: string;
    state?: string;
    businessName?: string;  // Populated when Place has a name (restaurant, hotel, cafe)
}

interface UseGooglePlacesOptions {
    debounceMs?: number;
    // When true: filters results to food/hospitality establishments (restaurants, hotels, cafes)
    businessMode?: boolean;
    // Restrict to a country (ISO 3166-1 alpha-2, e.g. 'in' for India)
    countryCode?: string;
}

export function useGooglePlacesAutocomplete(
    query: string,
    options: UseGooglePlacesOptions | number = {}
) {
    // Accept legacy numeric debounceMs for backward compatibility
    const opts: UseGooglePlacesOptions = typeof options === 'number'
        ? { debounceMs: options }
        : options;

    const { debounceMs = 300, businessMode = false, countryCode = 'in' } = opts;

    const { isLoaded, google } = useGoogleMaps();
    const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

    // Initialize services when Google Maps is loaded
    useEffect(() => {
        if (isLoaded && google) {
            serviceRef.current = new google.maps.places.AutocompleteService();
            const dummyDiv = document.createElement('div');
            placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }
    }, [isLoaded, google]);

    // Debounced search
    useEffect(() => {
        if (!isLoaded || !google || !serviceRef.current) {
            setPredictions([]);
            return;
        }

        if (!query || query.trim().length < 2) {
            setPredictions([]);
            setIsSearching(false);
            return;
        }

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        setIsSearching(true);

        debounceTimerRef.current = setTimeout(async () => {
            try {
                const request: google.maps.places.AutocompletionRequest = {
                    input: query,
                    sessionToken: sessionTokenRef.current!,
                    componentRestrictions: { country: countryCode },
                };

                // In business mode: restrict to food & lodging establishments
                if (businessMode) {
                    request.types = ['establishment'];
                }

                serviceRef.current!.getPlacePredictions(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        // In business mode: filter predictions to hospitality types
                        const filtered = businessMode
                            ? results.filter(r => {
                                const types = r.types || [];
                                return types.some(t => [
                                    'restaurant', 'cafe', 'bar', 'bakery', 'food',
                                    'meal_delivery', 'meal_takeaway', 'hotel', 'lodging',
                                    'night_club', 'establishment',
                                ].includes(t));
                            })
                            : results;

                        setPredictions(
                            (filtered.length > 0 ? filtered : results).map(r => ({
                                placeId: r.place_id,
                                description: r.description,
                                mainText: r.structured_formatting.main_text,
                                secondaryText: r.structured_formatting.secondary_text || '',
                            }))
                        );
                    } else {
                        setPredictions([]);
                    }
                    setIsSearching(false);
                });
            } catch (error) {
                console.error('Autocomplete error:', error);
                setPredictions([]);
                setIsSearching(false);
            }
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [query, isLoaded, google, debounceMs, businessMode, countryCode]);

    // Get full place details — includes businessName when place has a proper name
    const getPlaceDetails = useCallback(
        (placeId: string): Promise<PlaceDetails | null> => {
            return new Promise((resolve) => {
                if (!placesServiceRef.current || !google) {
                    resolve(null);
                    return;
                }

                const request: google.maps.places.PlaceDetailsRequest = {
                    placeId,
                    // Include 'name' to get business name (restaurant/hotel/cafe name)
                    fields: ['name', 'formatted_address', 'geometry', 'address_components', 'place_id', 'types'],
                    sessionToken: sessionTokenRef.current!,
                };

                placesServiceRef.current.getDetails(request, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                        const lat = place.geometry?.location?.lat() || 0;
                        const lng = place.geometry?.location?.lng() || 0;
                        const components = place.address_components || [];

                        const locality = components.find(c => c.types.includes('locality'));
                        const sublocality = components.find(c =>
                            c.types.includes('sublocality_level_1') || c.types.includes('sublocality')
                        );
                        const postalCode = components.find(c => c.types.includes('postal_code'));
                        const stateComp = components.find(c =>
                            c.types.includes('administrative_area_level_1')
                        );

                        const pincode = postalCode?.long_name || '';
                        const city = locality?.long_name || '';
                        const state = stateComp?.long_name || '';

                        let shortAddr = '';
                        if (sublocality && locality) {
                            shortAddr = `${sublocality.long_name}, ${locality.long_name}`;
                        } else if (locality) {
                            shortAddr = locality.long_name;
                        } else {
                            shortAddr = (place.formatted_address || '').split(',').slice(0, 2).join(',');
                        }

                        // Determine businessName:
                        // Only use place.name if it looks like a business name
                        // (not a street address — those typically start with digits or match formatted_address)
                        const placeName = place.name || '';
                        const isBusinessName = placeName.length > 0
                            && !place.formatted_address?.startsWith(placeName)
                            && !/^\d/.test(placeName);

                        // Refresh session token after place details call (cost optimization)
                        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

                        resolve({
                            placeId: place.place_id || placeId,
                            fullAddress: place.formatted_address || '',
                            shortAddress: shortAddr,
                            latitude: lat,
                            longitude: lng,
                            pincode,
                            city,
                            state,
                            businessName: isBusinessName ? placeName : undefined,
                        });
                    } else {
                        resolve(null);
                    }
                });
            });
        },
        [google]
    );

    const clearPredictions = useCallback(() => {
        setPredictions([]);
    }, []);

    return {
        predictions,
        isSearching,
        getPlaceDetails,
        clearPredictions,
    };
}
