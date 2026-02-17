'use client';

import React, { useState } from 'react';
import { ArrowLeft, Search, User, MapPin, Home, Briefcase, Loader2, Navigation, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAddress, Address } from '@/context/AddressContext';
import { useGooglePlacesAutocomplete, PlacePrediction } from '@/hooks/useGooglePlacesAutocomplete';
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider';
import { AddNewAddressOverlay } from './AddNewAddressOverlay';

interface LocationSelectionOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const LABEL_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
    Home: Home,
    Work: Briefcase,
    Other: MapPin,
};

export function LocationSelectionOverlay({ isOpen, onClose }: LocationSelectionOverlayProps) {
    const { isLoaded, loadError } = useGoogleMaps();
    const {
        selectedAddress,
        savedAddresses,
        setSelectedAddress,
        addAddress,
        removeAddress,
        detectCurrentLocation,
        isDetectingLocation,
    } = useAddress();

    const [searchQuery, setSearchQuery] = useState('');
    const [isAddNewOpen, setIsAddNewOpen] = useState(false);
    const [initialCoords, setInitialCoords] = useState<{ lat?: number; lng?: number }>({});

    // ─── Google Places autocomplete ──────────────────────────────────────
    const { predictions, isSearching, getPlaceDetails, clearPredictions } = useGooglePlacesAutocomplete(searchQuery);

    // ─── Select a saved address ──────────────────────────────────────────
    const handleSelectSaved = (addr: Address) => {
        setSelectedAddress(addr);
        onClose();
    };

    // ─── Select from autocomplete prediction ─────────────────────────────
    const handleSelectPrediction = async (pred: PlacePrediction) => {
        const details = await getPlaceDetails(pred.placeId);
        if (details) {
            // Open add-new-address overlay with the selected location pre-filled
            setInitialCoords({ lat: details.latitude, lng: details.longitude });
            setSearchQuery('');
            clearPredictions();
            setIsAddNewOpen(true);
        }
    };

    // ─── Use current location ────────────────────────────────────────────
    const handleUseCurrentLocation = async () => {
        const detected = await detectCurrentLocation();
        if (detected) {
            onClose();
        }
    };

    // ─── Save from AddNewAddressOverlay ──────────────────────────────────
    const handleSaveNewAddress = (address: Address) => {
        addAddress(address);
        setSelectedAddress(address);
        setIsAddNewOpen(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[11000] bg-white flex flex-col animate-in fade-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b border-gray-50">
                    <button onClick={onClose} className="p-1 -ml-1">
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800">Select a location</h2>
                    <button className="p-1 -mr-1">
                        <User size={24} className="text-gray-700" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pt-2 pb-24">
                    {/* Search Bar */}
                    <div className="mb-6 relative">
                        <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg w-full shadow-sm focus-within:border-[#33a852]/50 transition-colors">
                            <Search size={20} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                placeholder={isLoaded ? "Search for area, street name..." : "Loading maps..."}
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={!isLoaded}
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(''); clearPredictions(); }}>
                                    <X size={16} className="text-gray-400" />
                                </button>
                            )}
                            {isSearching && (
                                <Loader2 size={16} className="animate-spin text-gray-400 shrink-0" />
                            )}
                        </div>

                        {/* API Error Notice */}
                        {loadError && (
                            <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs text-amber-700">{loadError}</p>
                            </div>
                        )}

                        {/* Autocomplete Results */}
                        {predictions.length > 0 && (
                            <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">
                                {predictions.map((pred) => (
                                    <button
                                        key={pred.placeId}
                                        onClick={() => handleSelectPrediction(pred)}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left border-b border-gray-50 last:border-0"
                                    >
                                        <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{pred.mainText}</p>
                                            <p className="text-xs text-gray-400 truncate mt-0.5">{pred.secondaryText}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Use Current Location */}
                    <button
                        onClick={handleUseCurrentLocation}
                        disabled={isDetectingLocation}
                        className="w-full flex items-center gap-4 p-4 bg-[#e9f9e9] border border-[#d1f2d1] rounded-lg mb-8 group active:scale-[0.98] transition-transform text-left disabled:opacity-60"
                    >
                        <div className="w-10 h-10 shrink-0 bg-white rounded-full flex items-center justify-center shadow-sm">
                            {isDetectingLocation ? (
                                <Loader2 size={20} className="animate-spin text-[#33a852]" />
                            ) : (
                                <Navigation size={20} className="text-[#33a852]" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold text-[#33a852]">
                                {isDetectingLocation ? 'Detecting location...' : 'Use current location'}
                            </h3>
                            <p className="text-[11px] text-[#33a852]/70 font-medium truncate mt-0.5">
                                {selectedAddress?.shortAddress || 'Using GPS'}
                            </p>
                        </div>
                    </button>

                    {/* Saved Addresses */}
                    {savedAddresses.length > 0 && (
                        <>
                            <div className="text-center mb-6">
                                <h3 className="text-sm font-extrabold text-black uppercase tracking-wider">Saved Addresses</h3>
                            </div>

                            <div className="space-y-4 mb-12">
                                {savedAddresses.map((addr) => {
                                    const Icon = LABEL_ICONS[addr.label] || MapPin;
                                    const isSelected = selectedAddress?.id === addr.id;

                                    return (
                                        <div
                                            key={addr.id}
                                            onClick={() => handleSelectSaved(addr)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 bg-white border rounded-lg shadow-sm cursor-pointer transition-all active:scale-[0.98]",
                                                isSelected
                                                    ? "border-[#33a852] ring-1 ring-[#33a852]/20"
                                                    : "border-gray-100 hover:border-gray-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center",
                                                isSelected ? "bg-[#e9f9e9]" : "bg-gray-50"
                                            )}>
                                                <Icon size={24} className={isSelected ? "text-[#33a852]" : "text-gray-500"} />
                                            </div>
                                            <div className="flex-1 min-w-0 border-l border-gray-100 pl-4">
                                                <h4 className="text-[15px] font-bold text-gray-800">{addr.label}</h4>
                                                <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
                                                    {addr.flatInfo ? `${addr.flatInfo}, ` : ''}{addr.shortAddress || addr.fullAddress}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Remove this address?')) {
                                                        removeAddress(addr.id);
                                                    }
                                                }}
                                                className="p-2 hover:bg-red-50 rounded-full transition-colors shrink-0"
                                            >
                                                <Trash2 size={16} className="text-gray-300 hover:text-red-400" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Empty state when no saved addresses */}
                    {savedAddresses.length === 0 && (
                        <div className="text-center py-8 mb-8">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MapPin size={28} className="text-gray-300" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-500 mb-1">No saved addresses</h3>
                            <p className="text-xs text-gray-400">Add an address to get started</p>
                        </div>
                    )}
                </div>

                {/* Sticky Bottom Button */}
                <div className="p-4 bg-white border-t border-gray-50 sticky bottom-0">
                    <button
                        onClick={() => {
                            setInitialCoords({});
                            setIsAddNewOpen(true);
                        }}
                        className="w-full bg-[#5cb85c] hover:bg-[#4cae4c] text-white font-bold py-4 rounded-lg shadow-lg active:scale-[0.98] transition-all text-lg"
                    >
                        Add new address
                    </button>
                </div>
            </div>

            {/* Add New Address Overlay (opens on top) */}
            <AddNewAddressOverlay
                isOpen={isAddNewOpen}
                onClose={() => setIsAddNewOpen(false)}
                onSave={handleSaveNewAddress}
                initialLat={initialCoords.lat}
                initialLng={initialCoords.lng}
            />
        </>
    );
}
