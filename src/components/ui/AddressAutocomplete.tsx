'use client';

/**
 * AddressAutocomplete — drop-in Google Places autocomplete with a dropdown.
 *
 * Use anywhere you want the user to pick an address from the map and get back
 * fully-resolved details (lat/lng, pincode, city, state, formatted address).
 *
 * Picking a prediction calls `onPick` with a PlaceDetails-like payload. Parent
 * decides how to plug the values into its own form fields.
 *
 * Reuses the existing `useGooglePlacesAutocomplete` hook so it inherits the
 * same debouncing, session-token cost optimization, and India-restricted
 * filtering used elsewhere in the app.
 */

import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { useGooglePlacesAutocomplete, type PlaceDetails } from '@/hooks/useGooglePlacesAutocomplete';

export interface AddressPickPayload {
  fullAddress: string;
  shortAddress: string;
  latitude: number;
  longitude: number;
  pincode: string;
  city: string;
  state: string;
  placeId: string;
  businessName?: string;
}

interface Props {
  label?: string;
  placeholder?: string;
  initialValue?: string;
  onPick: (place: AddressPickPayload) => void;
  /** When true: prefer hospitality businesses in the dropdown (restaurants/hotels). */
  businessMode?: boolean;
  /** Optional className for the outer wrapper. */
  className?: string;
  /** Tell the user what this picker is for (small helper text under the input). */
  hint?: string;
}

export function AddressAutocomplete({
  label = 'Search address',
  placeholder = 'Type your address or business name…',
  initialValue = '',
  onPick,
  businessMode = false,
  className = '',
  hint,
}: Props) {
  const [query, setQuery] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { predictions, isSearching, getPlaceDetails, clearPredictions } =
    useGooglePlacesAutocomplete(query, { businessMode });

  // Close dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', onDown);
      return () => document.removeEventListener('mousedown', onDown);
    }
  }, [open]);

  const handlePick = async (placeId: string, mainText: string) => {
    setPickingId(placeId);
    try {
      const details: PlaceDetails | null = await getPlaceDetails(placeId);
      if (!details) return;
      setQuery(details.shortAddress || mainText);
      clearPredictions();
      setOpen(false);
      onPick({
        fullAddress: details.fullAddress,
        shortAddress: details.shortAddress,
        latitude: details.latitude,
        longitude: details.longitude,
        pincode: details.pincode || '',
        city: details.city || '',
        state: details.state || '',
        placeId: details.placeId,
        businessName: details.businessName,
      });
    } finally {
      setPickingId(null);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <label className="block">
        <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">{label}</span>
        <div className="relative mt-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEAE]" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-9 py-2 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/50 text-gray-700 placeholder:text-gray-400"
          />
          {isSearching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEAE] animate-spin" />
          )}
        </div>
      </label>
      {hint && <p className="mt-1 text-[11px] text-[#AEAEAE]">{hint}</p>}

      {open && predictions.length > 0 && (
        <ul className="absolute z-[10020] mt-1 w-full max-h-[260px] overflow-y-auto bg-white border border-[#EEEEEE] rounded-xl shadow-lg">
          {predictions.map((p) => {
            const isPicking = pickingId === p.placeId;
            return (
              <li key={p.placeId}>
                <button
                  type="button"
                  onClick={() => handlePick(p.placeId, p.mainText)}
                  disabled={isPicking}
                  className="w-full text-left px-3 py-2.5 hover:bg-[#F8F8F8] flex items-start gap-2 disabled:opacity-50"
                >
                  <MapPin size={14} className="text-[#299E60] mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[#181725] truncate">{p.mainText}</span>
                    <span className="block text-[11px] text-[#AEAEAE] truncate">{p.secondaryText}</span>
                  </span>
                  {isPicking && <Loader2 size={12} className="animate-spin text-[#AEAEAE] mt-1" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
