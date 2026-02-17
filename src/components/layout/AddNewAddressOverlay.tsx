'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Search, X, MapPin, Loader2, Home, Briefcase, Navigation } from 'lucide-react';
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider';
import { useAddress, Address } from '@/context/AddressContext';

interface AddNewAddressOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (address: Address) => void;
    initialLat?: number;
    initialLng?: number;
    initialAddress?: string;
}

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India center
const DEFAULT_ZOOM = 5;
const DETAIL_ZOOM = 16;

export function AddNewAddressOverlay({
    isOpen,
    onClose,
    onSave,
    initialLat,
    initialLng,
    initialAddress,
}: AddNewAddressOverlayProps) {
    const { isLoaded, google } = useGoogleMaps();
    const { reverseGeocode } = useAddress();

    // Map refs
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

    // Form state
    const [currentAddress, setCurrentAddress] = useState(initialAddress || '');
    const [shortAddress, setShortAddress] = useState('');
    const [pincode, setPincode] = useState('');
    const [placeId, setPlaceId] = useState('');
    const [latLng, setLatLng] = useState<{ lat: number; lng: number }>({
        lat: initialLat || DEFAULT_CENTER.lat,
        lng: initialLng || DEFAULT_CENTER.lng,
    });
    const [flatInfo, setFlatInfo] = useState('');
    const [landmark, setLandmark] = useState('');
    const [addressLabel, setAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
    const [isGeocodingPin, setIsGeocodingPin] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Initialize Map ──────────────────────────────────────────────────

    useEffect(() => {
        if (!isOpen || !isLoaded || !google || !mapContainerRef.current) return;
        if (mapRef.current) return; // Already initialized

        const center = (initialLat && initialLng)
            ? { lat: initialLat, lng: initialLng }
            : DEFAULT_CENTER;

        const zoom = (initialLat && initialLng) ? DETAIL_ZOOM : DEFAULT_ZOOM;

        const map = new google.maps.Map(mapContainerRef.current, {
            center,
            zoom,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER,
            },
            gestureHandling: 'greedy',
            mapId: 'horecahub_map',
        });

        mapRef.current = map;

        // Create AdvancedMarkerElement (draggable)
        const markerContent = document.createElement('div');
        markerContent.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;">
                <div style="width:40px;height:40px;background:#33a852;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(51,168,82,0.4);">
                    <div style="width:14px;height:14px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
                </div>
                <div style="width:2px;height:8px;background:#33a852;margin-top:-2px;"></div>
                <div style="width:8px;height:3px;background:rgba(0,0,0,0.2);border-radius:50%;"></div>
            </div>
        `;

        const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: center,
            gmpDraggable: true,
            content: markerContent,
        });

        markerRef.current = marker;

        // When marker is dragged, reverse geocode
        marker.addListener('dragend', async () => {
            const pos = marker.position as google.maps.LatLng | google.maps.LatLngLiteral;
            const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
            const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;

            setLatLng({ lat, lng });
            setIsGeocodingPin(true);

            const geocoded = await reverseGeocode(lat, lng);
            if (geocoded) {
                setCurrentAddress(geocoded.fullAddress || '');
                setShortAddress(geocoded.shortAddress || '');
                setPincode(geocoded.pincode || '');
                setPlaceId(geocoded.placeId || '');
            }
            setIsGeocodingPin(false);
        });

        // Also geocode on map click
        map.addListener('click', async (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();

            marker.position = e.latLng;
            setLatLng({ lat, lng });
            setIsGeocodingPin(true);

            const geocoded = await reverseGeocode(lat, lng);
            if (geocoded) {
                setCurrentAddress(geocoded.fullAddress || '');
                setShortAddress(geocoded.shortAddress || '');
                setPincode(geocoded.pincode || '');
                setPlaceId(geocoded.placeId || '');
            }
            setIsGeocodingPin(false);
        });

        // Init autocomplete service
        autocompleteRef.current = new google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);

        // If initial coords provided, geocode them
        if (initialLat && initialLng) {
            (async () => {
                setIsGeocodingPin(true);
                const geocoded = await reverseGeocode(initialLat, initialLng);
                if (geocoded) {
                    setCurrentAddress(geocoded.fullAddress || '');
                    setShortAddress(geocoded.shortAddress || '');
                    setPincode(geocoded.pincode || '');
                    setPlaceId(geocoded.placeId || '');
                }
                setIsGeocodingPin(false);
            })();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isLoaded, google]);

    // ─── Cleanup map on close ────────────────────────────────────────────

    useEffect(() => {
        if (!isOpen) {
            mapRef.current = null;
            markerRef.current = null;
            setSearchQuery('');
            setPredictions([]);
            setShowSearchResults(false);
            setFlatInfo('');
            setLandmark('');
            setCurrentAddress(initialAddress || '');
        }
    }, [isOpen, initialAddress]);

    // ─── Search autocomplete ─────────────────────────────────────────────

    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2 || !autocompleteRef.current || !google) {
            setPredictions([]);
            setIsSearching(false);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        setIsSearching(true);

        debounceRef.current = setTimeout(() => {
            autocompleteRef.current!.getPlacePredictions(
                { input: searchQuery },
                (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        setPredictions(results);
                    } else {
                        setPredictions([]);
                    }
                    setIsSearching(false);
                }
            );
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchQuery, google]);

    // ─── Select a prediction ─────────────────────────────────────────────

    const selectPrediction = useCallback(async (prediction: google.maps.places.AutocompletePrediction) => {
        if (!placesServiceRef.current || !google) return;

        setShowSearchResults(false);
        setSearchQuery('');
        setPredictions([]);

        placesServiceRef.current.getDetails(
            {
                placeId: prediction.place_id,
                fields: ['formatted_address', 'geometry', 'address_components', 'place_id'],
            },
            (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    const lat = place.geometry?.location?.lat() || 0;
                    const lng = place.geometry?.location?.lng() || 0;
                    const components = place.address_components || [];

                    let pc = '';
                    let sa = '';
                    const locality = components.find(c => c.types.includes('locality'));
                    const sublocality = components.find(c =>
                        c.types.includes('sublocality_level_1') || c.types.includes('sublocality')
                    );
                    const postalCode = components.find(c => c.types.includes('postal_code'));

                    if (postalCode) pc = postalCode.long_name;
                    if (sublocality && locality) {
                        sa = `${sublocality.long_name}, ${locality.long_name}`;
                    } else if (locality) {
                        sa = locality.long_name;
                    } else {
                        sa = (place.formatted_address || '').split(',').slice(0, 2).join(',');
                    }

                    setLatLng({ lat, lng });
                    setCurrentAddress(place.formatted_address || '');
                    setShortAddress(sa);
                    setPincode(pc);
                    setPlaceId(place.place_id || '');

                    // Move map and marker
                    if (mapRef.current) {
                        mapRef.current.panTo({ lat, lng });
                        mapRef.current.setZoom(DETAIL_ZOOM);
                    }
                    if (markerRef.current) {
                        markerRef.current.position = { lat, lng };
                    }
                }
            }
        );
    }, [google]);

    // ─── Use current location ────────────────────────────────────────────

    const useCurrentLocation = useCallback(async () => {
        if (!navigator.geolocation) return;

        setIsGeocodingPin(true);
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                });
            });

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            setLatLng({ lat, lng });

            if (mapRef.current) {
                mapRef.current.panTo({ lat, lng });
                mapRef.current.setZoom(DETAIL_ZOOM);
            }
            if (markerRef.current) {
                markerRef.current.position = { lat, lng };
            }

            const geocoded = await reverseGeocode(lat, lng);
            if (geocoded) {
                setCurrentAddress(geocoded.fullAddress || '');
                setShortAddress(geocoded.shortAddress || '');
                setPincode(geocoded.pincode || '');
                setPlaceId(geocoded.placeId || '');
            }
        } catch (e) {
            console.error('Location error:', e);
            alert('Could not get your location. Please allow location access.');
        }
        setIsGeocodingPin(false);
    }, [reverseGeocode]);

    // ─── Save address ────────────────────────────────────────────────────

    const handleSave = useCallback(() => {
        if (!currentAddress) {
            alert('Please select a location on the map first');
            return;
        }

        const address: Address = {
            id: `addr_${Date.now()}`,
            label: addressLabel,
            fullAddress: currentAddress,
            shortAddress: shortAddress || currentAddress.split(',').slice(0, 2).join(', '),
            latitude: latLng.lat,
            longitude: latLng.lng,
            pincode,
            placeId,
            flatInfo: flatInfo || undefined,
            landmark: landmark || undefined,
        };

        onSave(address);
    }, [currentAddress, shortAddress, latLng, pincode, placeId, flatInfo, landmark, addressLabel, onSave]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[12000] bg-white flex flex-col animate-in fade-in slide-in-from-bottom duration-300">
            {/* Header with search */}
            <div className="sticky top-0 z-20 bg-white shadow-sm">
                <div className="flex items-center gap-3 p-3">
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                        <ArrowLeft size={22} className="text-gray-700" />
                    </button>

                    <div className="flex-1 relative">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full">
                            <Search size={18} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search for area, street name..."
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowSearchResults(true);
                                }}
                                onFocus={() => setShowSearchResults(true)}
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(''); setPredictions([]); }}>
                                    <X size={16} className="text-gray-400" />
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {showSearchResults && (searchQuery.length >= 2) && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-[60vh] overflow-y-auto z-30">
                                {/* Use Current Location button */}
                                <button
                                    onClick={() => {
                                        useCurrentLocation();
                                        setShowSearchResults(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                                >
                                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                                        <Navigation size={16} className="text-blue-500" />
                                    </div>
                                    <span className="text-sm font-semibold text-blue-600">Use current location</span>
                                </button>

                                {isSearching && (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 size={20} className="animate-spin text-gray-400" />
                                        <span className="text-sm text-gray-400 ml-2">Searching...</span>
                                    </div>
                                )}

                                {!isSearching && predictions.length === 0 && searchQuery.length >= 2 && (
                                    <div className="py-6 text-center text-sm text-gray-400">
                                        No results found
                                    </div>
                                )}

                                {predictions.map((pred) => (
                                    <button
                                        key={pred.place_id}
                                        onClick={() => selectPrediction(pred)}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                    >
                                        <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                {pred.structured_formatting.main_text}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate mt-0.5">
                                                {pred.structured_formatting.secondary_text}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative">
                <div ref={mapContainerRef} className="w-full h-full" />

                {/* Loading overlay for map */}
                {!isLoaded && (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                            <Loader2 size={32} className="animate-spin text-[#33a852] mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Loading map...</p>
                        </div>
                    </div>
                )}

                {/* Current location FAB */}
                <button
                    onClick={useCurrentLocation}
                    className="absolute right-4 bottom-4 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all border border-gray-100 z-10"
                >
                    <Navigation size={20} className="text-blue-500" />
                </button>

                {/* Geocoding pin indicator */}
                {isGeocodingPin && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-10">
                        <Loader2 size={14} className="animate-spin text-[#33a852]" />
                        <span className="text-xs font-medium text-gray-600">Finding address...</span>
                    </div>
                )}
            </div>

            {/* Address Details Card */}
            <div className="bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] relative z-10">
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-2 mb-3" />

                <div className="px-4 pb-4 max-h-[45vh] overflow-y-auto">
                    {/* Current detected address */}
                    <div className="flex items-start gap-3 mb-4">
                        <MapPin size={20} className="text-[#33a852] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold text-gray-800 truncate">
                                {shortAddress || 'Select a location'}
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                                {currentAddress || 'Drag the pin or search to select a location'}
                            </p>
                        </div>
                    </div>

                    {/* Flat/Floor Input */}
                    <input
                        type="text"
                        placeholder="Flat / House no / Floor / Building *"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#33a852] transition-colors mb-3"
                        value={flatInfo}
                        onChange={(e) => setFlatInfo(e.target.value)}
                    />

                    {/* Landmark Input */}
                    <input
                        type="text"
                        placeholder="Nearby landmark (optional)"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#33a852] transition-colors mb-4"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                    />

                    {/* Address Label */}
                    <div className="mb-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Save as</p>
                        <div className="flex gap-2">
                            {([
                                { label: 'Home' as const, icon: Home },
                                { label: 'Work' as const, icon: Briefcase },
                                { label: 'Other' as const, icon: MapPin },
                            ]).map(({ label, icon: Icon }) => (
                                <button
                                    key={label}
                                    onClick={() => setAddressLabel(label)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-semibold transition-all ${addressLabel === label
                                            ? 'border-[#33a852] bg-[#e9f9e9] text-[#33a852]'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon size={16} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={!currentAddress || isGeocodingPin}
                        className="w-full bg-[#33a852] hover:bg-[#2d9548] disabled:bg-gray-300 text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all text-base"
                    >
                        {isGeocodingPin ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 size={18} className="animate-spin" />
                                Finding address...
                            </span>
                        ) : (
                            'Save address'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
