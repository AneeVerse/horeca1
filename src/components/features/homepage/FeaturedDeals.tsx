'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { dal } from '@/lib/dal';
import { useAddress } from '@/context/AddressContext';
import { VendorProductCard } from '@/components/features/vendor/VendorProductCard';
import type { VendorProduct } from '@/types';

export function FeaturedDeals() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { selectedAddress } = useAddress();
  const pincode = selectedAddress?.pincode;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const validPincode = pincode && /^\d{6}$/.test(pincode) ? pincode : undefined;
    dal.products
      .deals({ pincode: validPincode, limit: 12 })
      .then((res) => {
        if (!cancelled) setProducts(res.products);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pincode]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (!loading && products.length === 0) return null;

  return (
    <section className="w-full py-6 bg-white overflow-hidden">
      <div className="max-w-[var(--container-max)] mx-auto">
        <div className="flex items-center justify-between mb-4 px-6 md:px-[var(--container-padding)]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <h2 className="text-[18px] md:text-[22px] lg:text-[24px] font-[900] text-[#181725] tracking-tight">
              Featured Deals
            </h2>
          </div>
          <span className="text-[12px] md:text-[13px] font-bold text-gray-500">
            {products.length > 0 ? `${products.length} on sale` : ''}
          </span>
        </div>

        <div className="relative w-full">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] items-center justify-center hover:scale-110 active:scale-95 transition-all border border-gray-100"
            aria-label="Scroll left"
          >
            <ChevronLeft size={24} className="text-[#181725]" strokeWidth={2.5} />
          </button>

          <div
            ref={scrollRef}
            className="overflow-x-auto no-scrollbar scroll-smooth w-full"
          >
            <div className="flex gap-4 py-2 px-6 md:px-[var(--container-padding)] w-max">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[260px] w-[180px] shrink-0 rounded-2xl bg-gray-100 animate-pulse"
                    />
                  ))
                : products.map((p) => (
                    <div key={p.id} className="w-[180px] md:w-[200px] shrink-0">
                      <VendorProductCard product={p} />
                    </div>
                  ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => scroll('right')}
            className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] items-center justify-center hover:scale-110 active:scale-95 transition-all border border-gray-100"
            aria-label="Scroll right"
          >
            <ChevronRight size={24} className="text-[#181725]" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  );
}
