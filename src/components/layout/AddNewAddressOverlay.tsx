'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ArrowLeft, Search, X, MapPin, Loader2, Home, Briefcase,
    Navigation, Store, CheckCircle, Building2, Edit3,
} from 'lucide-react';
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider';
import { useAddress, Address } from '@/context/AddressContext';
import { useGooglePlacesAutocomplete, PlaceDetails } from '@/hooks/useGooglePlacesAutocomplete';

interface AddNewAddressOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (address: Omit<Address, 'id'>) => void;
    initialLat?: number;
    initialLng?: number;
    initialAddress?: string;
    defaultMode?: 'business' | 'map';
}

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India center
const DETAIL_ZOOM = 16;

type Mode = 'business' | 'map';
type LabelType = 'Business' | 'Home' | 'Work' | 'Other';

export function AddNewAddressOverlay({
    isOpen,
    onClose,
    onSave,
    initialLat,
    initialLng,
    initialAddress,
    defaultMode = 'business',
}: AddNewAddressOverlayProps) {
    const { isLoaded, google } = useGoogleMaps();
    const { reverseGeocode } = useAddress();

    const [mode, setMode] = useState<Mode>(defaultMode);

    // ─── Business Search State ────────────────────────────────────────────

    const [businessQuery, setBusinessQuery] = useState('');
    const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
    const [businessNameEdit, setBusinessNameEdit] = useState('');
    const [addressEdit, setAddressEdit] = useState('');
    const [flatInfo, setFlatInfo] = useState('');
    const [landmark, setLandmark] = useState('');
    const [label, setLabel] = useState<LabelType>('Business');
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);

    const { predictions, isSearching, getPlaceDetails, clearPredictions } =
        useGooglePlacesAutocomplete(businessQuery, { businessMode: true, countryCode: 'in' });

    // ─── Map State ────────────────────────────────────────────────────────

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const mapAutocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const mapPlacesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const mapDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [mapAddress, setMapAddress] = useState('');
    const [mapShortAddress, setMapShortAddress] = useState('');
    const [mapPincode, setMapPincode] = useState('');
    const [mapCity, setMapCity] = useState('');
    const [mapState, setMapState] = useState('');
    const [mapPlaceId, setMapPlaceId] = useState('');
    const [mapLatLng, setMapLatLng] = useState({ lat: initialLat || DEFAULT_CENTER.lat, lng: initialLng || DEFAULT_CENTER.lng });
    const [mapFlatInfo, setMapFlatInfo] = useState('');
    const [mapLandmark, setMapLandmark] = useState('');
    const [mapLabel, setMapLabel] = useState<LabelType>('Home');
    const [isGeocodingPin, setIsGeocodingPin] = useState(false);

    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [mapPredictions, setMapPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isMapSearching, setIsMapSearching] = useState(false);
    const [showMapDropdown, setShowMapDropdown] = useState(false);

    // ─── Init Map ────────────────────────────────────────────────────────

    useEffect(() => {
        if (mode !== 'map' || !isOpen || !isLoaded || !google || !mapContainerRef.current) return;
        if (mapRef.current) return;

        const center = (initialLat && initialLng)
            ? { lat: initialLat, lng: initialLng }
            : DEFAULT_CENTER;
        const zoom = (initialLat && initialLng) ? DETAIL_ZOOM : 5;

        const map = new google.maps.Map(mapContainerRef.current, {
            center, zoom,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
            gestureHandling: 'greedy',
            mapId: 'horecahub_map',
        });
        mapRef.current = map;

        const markerContent = document.createElement('div');
        markerContent.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;">
                <div style="width:40px;height:40px;background:#33a852;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(51,168,82,0.4);">
                    <div style="width:14px;height:14px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
                </div>
                <div style="width:2px;height:8px;background:#33a852;margin-top:-2px;"></div>
                <div style="width:8px;height:3px;background:rgba(0,0,0,0.2);border-radius:50%;"></div>
            </div>`;

        const marker = new google.maps.marker.AdvancedMarkerElement({
            map, position: center, gmpDraggable: true, content: markerContent,
        });
        markerRef.current = marker;

        const updateFromLatLng = async (lat: number, lng: number) => {
            setMapLatLng({ lat, lng });
            setIsGeocodingPin(true);
            const geocoded = await reverseGeocode(lat, lng);
            if (geocoded) {
                setMapAddress(geocoded.fullAddress || '');
                setMapShortAddress(geocoded.shortAddress || '');
                setMapPincode(geocoded.pincode || '');
                setMapCity(geocoded.city || '');
                setMapState(geocoded.state || '');
                setMapPlaceId(geocoded.placeId || '');
            }
            setIsGeocodingPin(false);
        };

        marker.addListener('dragend', async () => {
            const pos = marker.position as google.maps.LatLng | google.maps.LatLngLiteral;
            const lat = typeof pos.lat === 'function' ? (pos as google.maps.LatLng).lat() : (pos as google.maps.LatLngLiteral).lat;
            const lng = typeof pos.lng === 'function' ? (pos as google.maps.LatLng).lng() : (pos as google.maps.LatLngLiteral).lng;
            await updateFromLatLng(lat, lng);
        });

        map.addListener('click', async (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            marker.position = e.latLng;
            await updateFromLatLng(e.latLng.lat(), e.latLng.lng());
        });

        mapAutocompleteRef.current = new google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement('div');
        mapPlacesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);

        if (initialLat && initialLng) updateFromLatLng(initialLat, initialLng);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, isOpen, isLoaded, google]);

    // ─── Cleanup on close / mode switch ─────────────────────────────────

    useEffect(() => {
        if (!isOpen) {
            mapRef.current = null;
            markerRef.current = null;
            setBusinessQuery('');
            setSelectedPlace(null);
            setBusinessNameEdit('');
            setAddressEdit('');
            setFlatInfo('');
            setLandmark('');
            setMapSearchQuery('');
            setMapPredictions([]);
            setMapFlatInfo('');
            setMapLandmark('');
            setMode(defaultMode);
        }
    }, [isOpen, defaultMode]);

    useEffect(() => {
        if (mode === 'map') {
            mapRef.current = null; // Force re-init when switching to map tab
        }
    }, [mode]);

    // ─── Map search autocomplete ─────────────────────────────────────────

    useEffect(() => {
        if (!mapSearchQuery || mapSearchQuery.length < 2 || !mapAutocompleteRef.current || !google) {
            setMapPredictions([]);
            return;
        }
        if (mapDebounceRef.current) clearTimeout(mapDebounceRef.current);
        setIsMapSearching(true);
        mapDebounceRef.current = setTimeout(() => {
            mapAutocompleteRef.current!.getPlacePredictions(
                { input: mapSearchQuery, componentRestrictions: { country: 'in' } },
                (results, status) => {
                    setMapPredictions(status === google.maps.places.PlacesServiceStatus.OK && results ? results : []);
                    setIsMapSearching(false);
                }
            );
        }, 300);
        return () => { if (mapDebounceRef.current) clearTimeout(mapDebounceRef.current); };
    }, [mapSearchQuery, google]);

    const selectMapPrediction = useCallback(async (pred: google.maps.places.AutocompletePrediction) => {
        if (!mapPlacesServiceRef.current || !google) return;
        setShowMapDropdown(false);
        setMapSearchQuery('');
        setMapPredictions([]);

        mapPlacesServiceRef.current.getDetails(
            { placeId: pred.place_id, fields: ['formatted_address', 'geometry', 'address_components', 'place_id'] },
            (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    const lat = place.geometry?.location?.lat() || 0;
                    const lng = place.geometry?.location?.lng() || 0;
                    const components = place.address_components || [];
                    const locality = components.find(c => c.types.includes('locality'));
                    const sublocality = components.find(c => c.types.includes('sublocality_level_1') || c.types.includes('sublocality'));
                    const postalCode = components.find(c => c.types.includes('postal_code'));
                    const stateComp = components.find(c => c.types.includes('administrative_area_level_1'));

                    setMapLatLng({ lat, lng });
                    setMapAddress(place.formatted_address || '');
                    setMapShortAddress(sublocality && locality ? `${sublocality.long_name}, ${locality.long_name}` : locality?.long_name || '');
                    setMapPincode(postalCode?.long_name || '');
                    setMapCity(locality?.long_name || '');
                    setMapState(stateComp?.long_name || '');
                    setMapPlaceId(place.place_id || '');

                    if (mapRef.current) { mapRef.current.panTo({ lat, lng }); mapRef.current.setZoom(DETAIL_ZOOM); }
                    if (markerRef.current) markerRef.current.position = { lat, lng };
                }
            }
        );
    }, [google]);

    const useCurrentLocation = useCallback(async () => {
        if (!navigator.geolocation) return;
        setIsGeocodingPin(true);
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
            );
            const { latitude: lat, longitude: lng } = pos.coords;
            setMapLatLng({ lat, lng });
            if (mapRef.current) { mapRef.current.panTo({ lat, lng }); mapRef.current.setZoom(DETAIL_ZOOM); }
            if (markerRef.current) markerRef.current.position = { lat, lng };
            const geocoded = await reverseGeocode(lat, lng);
            if (geocoded) {
                setMapAddress(geocoded.fullAddress || '');
                setMapShortAddress(geocoded.shortAddress || '');
                setMapPincode(geocoded.pincode || '');
                setMapCity(geocoded.city || '');
                setMapState(geocoded.state || '');
                setMapPlaceId(geocoded.placeId || '');
            }
        } catch { /* ignore */ }
        setIsGeocodingPin(false);
    }, [reverseGeocode]);

    // ─── Select a business from Places ──────────────────────────────────

    const handleSelectBusiness = useCallback(async (placeId: string) => {
        setShowBusinessDropdown(false);
        setIsFetchingDetails(true);
        clearPredictions();
        const details = await getPlaceDetails(placeId);
        if (details) {
            setSelectedPlace(details);
            setBusinessNameEdit(details.businessName || '');
            setAddressEdit(details.fullAddress);
        }
        setIsFetchingDetails(false);
    }, [getPlaceDetails, clearPredictions]);

    // ─── Save handlers ───────────────────────────────────────────────────

    const handleSaveBusiness = useCallback(() => {
        if (!selectedPlace) return;
        onSave({
            label,
            businessName: businessNameEdit || undefined,
            fullAddress: addressEdit || selectedPlace.fullAddress,
            shortAddress: selectedPlace.shortAddress,
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude,
            pincode: selectedPlace.pincode,
            city: selectedPlace.city,
            state: selectedPlace.state,
            placeId: selectedPlace.placeId,
            flatInfo: flatInfo || undefined,
            landmark: landmark || undefined,
            isDefault: false,
        });
    }, [selectedPlace, label, businessNameEdit, addressEdit, flatInfo, landmark, onSave]);

    const handleSaveMap = useCallback(() => {
        if (!mapAddress) return;
        onSave({
            label: mapLabel,
            fullAddress: mapAddress,
            shortAddress: mapShortAddress || mapAddress.split(',').slice(0, 2).join(', '),
            latitude: mapLatLng.lat,
            longitude: mapLatLng.lng,
            pincode: mapPincode,
            city: mapCity,
            state: mapState,
            placeId: mapPlaceId,
            flatInfo: mapFlatInfo || undefined,
            landmark: mapLandmark || undefined,
            isDefault: false,
        });
    }, [mapAddress, mapShortAddress, mapLatLng, mapPincode, mapCity, mapState, mapPlaceId, mapFlatInfo, mapLandmark, mapLabel, onSave]);

    if (!isOpen) return null;

    const LABEL_OPTIONS: { label: LabelType; icon: React.ElementType }[] = [
        { label: 'Business', icon: Store },
        { label: 'Home', icon: Home },
        { label: 'Work', icon: Briefcase },
        { label: 'Other', icon: MapPin },
    ];

    return (
        <div className="fixed inset-0 z-[12000] bg-white flex flex-col animate-in fade-in slide-in-from-bottom duration-300">

            {/* Header */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                        <ArrowLeft size={22} className="text-gray-700" />
                    </button>
                    <h2 className="text-[16px] font-bold text-gray-800">Add Delivery Address</h2>
                </div>

                {/* Mode tabs */}
                <div className="flex px-4 pb-0 gap-1">
                    <button
                        onClick={() => setMode('business')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold border-b-2 transition-colors ${mode === 'business'
                            ? 'border-[#33a852] text-[#33a852]'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <Store size={15} />
                        Search Business
                    </button>
                    <button
                        onClick={() => setMode('map')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold border-b-2 transition-colors ${mode === 'map'
                            ? 'border-[#33a852] text-[#33a852]'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <MapPin size={15} />
                        Map & GPS
                    </button>
                </div>
            </div>

            {/* ─── BUSINESS SEARCH MODE ───────────────────────────────────────── */}
            {mode === 'business' && (
                <div className="flex-1 overflow-y-auto">
                    <div className="px-4 pt-4">

                        {/* Search bar */}
                        <div className="relative mb-4">
                            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus-within:border-[#33a852] transition-colors">
                                <Search size={18} className="text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search for your restaurant, hotel, cafe..."
                                    className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-gray-400 text-gray-800"
                                    value={businessQuery}
                                    onChange={(e) => {
                                        setBusinessQuery(e.target.value);
                                        setShowBusinessDropdown(true);
                                        if (!e.target.value) setSelectedPlace(null);
                                    }}
                                    onFocus={() => setShowBusinessDropdown(true)}
                                    autoComplete="off"
                                />
                                {businessQuery ? (
                                    <button onClick={() => { setBusinessQuery(''); setSelectedPlace(null); clearPredictions(); }}>
                                        <X size={16} className="text-gray-400" />
                                    </button>
                                ) : null}
                            </div>

                            {/* Dropdown */}
                            {showBusinessDropdown && businessQuery.length >= 2 && !selectedPlace && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-[50vh] overflow-y-auto z-30">
                                    {(isSearching || isFetchingDetails) && (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 size={20} className="animate-spin text-[#33a852]" />
                                            <span className="text-sm text-gray-400 ml-2">Searching...</span>
                                        </div>
                                    )}

                                    {!isSearching && !isFetchingDetails && predictions.length === 0 && (
                                        <div className="py-6 text-center">
                                            <Building2 size={28} className="text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-400">No businesses found</p>
                                            <p className="text-xs text-gray-300 mt-1">Try a different name or switch to Map mode</p>
                                        </div>
                                    )}

                                    {predictions.map((pred) => (
                                        <button
                                            key={pred.placeId}
                                            onClick={() => handleSelectBusiness(pred.placeId)}
                                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                        >
                                            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                                <Store size={16} className="text-[#33a852]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-gray-800 leading-tight">{pred.mainText}</p>
                                                <p className="text-[12px] text-gray-400 truncate mt-0.5">{pred.secondaryText}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected business card */}
                        {selectedPlace ? (
                            <div className="space-y-3">
                                {/* Success indicator */}
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle size={16} className="text-[#33a852]" />
                                    <span className="text-[12px] font-bold text-[#33a852]">Business found — edit details below if needed</span>
                                </div>

                                {/* Business name field */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Business Name
                                    </label>
                                    <div className="relative">
                                        <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#33a852]" />
                                        <input
                                            type="text"
                                            value={businessNameEdit}
                                            onChange={(e) => setBusinessNameEdit(e.target.value)}
                                            placeholder="Your restaurant / hotel / cafe name"
                                            className="w-full pl-9 pr-4 py-3 border-2 border-[#33a852]/30 rounded-xl text-[14px] font-bold text-gray-800 outline-none focus:border-[#33a852] bg-green-50/30 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Full address field */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Address
                                        <span className="ml-1 text-gray-400 normal-case font-normal">(auto-filled, editable)</span>
                                    </label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
                                        <textarea
                                            value={addressEdit}
                                            onChange={(e) => setAddressEdit(e.target.value)}
                                            rows={2}
                                            className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-[13px] text-gray-700 outline-none focus:border-[#33a852] bg-white transition-colors resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-3 mt-1">
                                        {selectedPlace.city && (
                                            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{selectedPlace.city}</span>
                                        )}
                                        {selectedPlace.state && (
                                            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{selectedPlace.state}</span>
                                        )}
                                        {selectedPlace.pincode && (
                                            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">📍 {selectedPlace.pincode}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Flat/Unit */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Floor / Unit / Building
                                    </label>
                                    <input
                                        type="text"
                                        value={flatInfo}
                                        onChange={(e) => setFlatInfo(e.target.value)}
                                        placeholder="e.g. Ground Floor, Shop 4, Wing B"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#33a852] transition-colors"
                                    />
                                </div>

                                {/* Landmark */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Nearby Landmark <span className="text-gray-400 normal-case font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={landmark}
                                        onChange={(e) => setLandmark(e.target.value)}
                                        placeholder="Near main gate / opposite bus stop..."
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#33a852] transition-colors"
                                    />
                                </div>

                                {/* Label */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Save As
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {LABEL_OPTIONS.map(({ label: l, icon: Icon }) => (
                                            <button
                                                key={l}
                                                onClick={() => setLabel(l)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border-2 text-[12px] font-bold transition-all ${label === l
                                                    ? 'border-[#33a852] bg-[#e9f9e9] text-[#33a852]'
                                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                                    }`}
                                            >
                                                <Icon size={13} />
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveBusiness}
                                    className="w-full bg-[#33a852] hover:bg-[#2d9548] text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all text-[15px] mt-2"
                                >
                                    Save Delivery Address
                                </button>
                            </div>
                        ) : (
                            /* Empty state */
                            <div className="py-12 text-center">
                                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Store size={28} className="text-[#33a852]" />
                                </div>
                                <h3 className="text-[15px] font-bold text-gray-700 mb-1">Find your business</h3>
                                <p className="text-[13px] text-gray-400 max-w-[260px] mx-auto">
                                    Search for your restaurant, hotel, cafe or catering kitchen above
                                </p>
                                <p className="text-[12px] text-gray-300 mt-3">
                                    Can&apos;t find it? Use <button onClick={() => setMode('map')} className="text-[#33a852] font-bold underline">Map &amp; GPS</button> instead
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── MAP & GPS MODE ─────────────────────────────────────────────── */}
            {mode === 'map' && (
                <>
                    {/* Map search bar */}
                    <div className="px-4 pt-3 pb-2 bg-white relative z-10">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full">
                            <Search size={18} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search area, street name..."
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                                value={mapSearchQuery}
                                onChange={(e) => { setMapSearchQuery(e.target.value); setShowMapDropdown(true); }}
                                onFocus={() => setShowMapDropdown(true)}
                            />
                            {mapSearchQuery && (
                                <button onClick={() => { setMapSearchQuery(''); setMapPredictions([]); }}>
                                    <X size={16} className="text-gray-400" />
                                </button>
                            )}
                        </div>

                        {showMapDropdown && mapSearchQuery.length >= 2 && (
                            <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-[50vh] overflow-y-auto z-30">
                                <button
                                    onClick={() => { useCurrentLocation(); setShowMapDropdown(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                                >
                                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                                        <Navigation size={16} className="text-blue-500" />
                                    </div>
                                    <span className="text-sm font-semibold text-blue-600">Use current location</span>
                                </button>
                                {isMapSearching && (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 size={18} className="animate-spin text-gray-400" />
                                    </div>
                                )}
                                {mapPredictions.map((pred) => (
                                    <button
                                        key={pred.place_id}
                                        onClick={() => { selectMapPrediction(pred); setShowMapDropdown(false); }}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                    >
                                        <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{pred.structured_formatting.main_text}</p>
                                            <p className="text-xs text-gray-400 truncate mt-0.5">{pred.structured_formatting.secondary_text}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Map */}
                    <div className="flex-1 relative min-h-[200px]">
                        <div ref={mapContainerRef} className="w-full h-full" />
                        {!isLoaded && (
                            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                                <Loader2 size={32} className="animate-spin text-[#33a852]" />
                            </div>
                        )}
                        <button
                            onClick={useCurrentLocation}
                            className="absolute right-4 bottom-4 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all border border-gray-100 z-10"
                        >
                            <Navigation size={20} className="text-blue-500" />
                        </button>
                        {isGeocodingPin && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-10">
                                <Loader2 size={14} className="animate-spin text-[#33a852]" />
                                <span className="text-xs font-medium text-gray-600">Finding address...</span>
                            </div>
                        )}
                    </div>

                    {/* Address form */}
                    <div className="bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] relative z-10">
                        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-2 mb-3" />
                        <div className="px-4 pb-4 max-h-[42vh] overflow-y-auto">
                            <div className="flex items-start gap-3 mb-4">
                                <MapPin size={20} className="text-[#33a852] mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[15px] font-bold text-gray-800 truncate">
                                        {mapShortAddress || 'Select a location'}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                                        {mapAddress || 'Drag the pin or search to select a location'}
                                    </p>
                                </div>
                            </div>

                            <input
                                type="text"
                                placeholder="Flat / House no / Floor / Building"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#33a852] transition-colors mb-3"
                                value={mapFlatInfo}
                                onChange={(e) => setMapFlatInfo(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Nearby landmark (optional)"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#33a852] transition-colors mb-4"
                                value={mapLandmark}
                                onChange={(e) => setMapLandmark(e.target.value)}
                            />

                            <div className="flex flex-wrap gap-2 mb-4">
                                {LABEL_OPTIONS.map(({ label: l, icon: Icon }) => (
                                    <button
                                        key={l}
                                        onClick={() => setMapLabel(l)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 text-[12px] font-bold transition-all ${mapLabel === l
                                            ? 'border-[#33a852] bg-[#e9f9e9] text-[#33a852]'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <Icon size={13} />
                                        {l}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleSaveMap}
                                disabled={!mapAddress || isGeocodingPin}
                                className="w-full bg-[#33a852] hover:bg-[#2d9548] disabled:bg-gray-300 text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all text-[15px]"
                            >
                                {isGeocodingPin ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 size={18} className="animate-spin" />Finding address...
                                    </span>
                                ) : 'Save Address'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
