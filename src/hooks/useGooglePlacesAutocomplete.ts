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
}

export function useGooglePlacesAutocomplete(query: string, debounceMs = 300) {
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
            // PlacesService needs a DOM element (can be a hidden div)
            const dummyDiv = document.createElement('div');
            placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
            // Create session token to group autocomplete + place details requests (saves cost)
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

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setIsSearching(true);

        debounceTimerRef.current = setTimeout(async () => {
            try {
                const request: google.maps.places.AutocompletionRequest = {
                    input: query,
                    sessionToken: sessionTokenRef.current!,
                    // You can restrict to a country:
                    // componentRestrictions: { country: 'in' },
                };

                serviceRef.current!.getPlacePredictions(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        setPredictions(
                            results.map(r => ({
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
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [query, isLoaded, google, debounceMs]);

    // Get full place details (lat/lng, formatted address, pincode)
    const getPlaceDetails = useCallback(
        (placeId: string): Promise<PlaceDetails | null> => {
            return new Promise((resolve) => {
                if (!placesServiceRef.current || !google) {
                    resolve(null);
                    return;
                }

                const request: google.maps.places.PlaceDetailsRequest = {
                    placeId,
                    fields: ['formatted_address', 'geometry', 'address_components', 'place_id'],
                    sessionToken: sessionTokenRef.current!,
                };

                placesServiceRef.current.getDetails(request, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                        const lat = place.geometry?.location?.lat() || 0;
                        const lng = place.geometry?.location?.lng() || 0;
                        const components = place.address_components || [];

                        let pincode = '';
                        let shortAddr = '';
                        const locality = components.find(c => c.types.includes('locality'));
                        const sublocality = components.find(c =>
                            c.types.includes('sublocality_level_1') || c.types.includes('sublocality')
                        );
                        const postalCode = components.find(c => c.types.includes('postal_code'));

                        if (postalCode) pincode = postalCode.long_name;
                        if (sublocality && locality) {
                            shortAddr = `${sublocality.long_name}, ${locality.long_name}`;
                        } else if (locality) {
                            shortAddr = locality.long_name;
                        } else {
                            shortAddr = (place.formatted_address || '').split(',').slice(0, 2).join(',');
                        }

                        // Refresh session token after place details call
                        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

                        resolve({
                            placeId: place.place_id || placeId,
                            fullAddress: place.formatted_address || '',
                            shortAddress: shortAddr,
                            latitude: lat,
                            longitude: lng,
                            pincode,
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
