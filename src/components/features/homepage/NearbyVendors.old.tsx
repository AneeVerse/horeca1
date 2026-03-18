// ==========================================================================
// OLD NEARBY VENDORS CODE - Preserved for reference
// Original file: src/components/features/homepage/NearbyVendors.tsx
// ==========================================================================
//
// 'use client';
//
// import React from 'react';
// import Link from 'next/link';
// import { Star, Clock, CreditCard, Package } from 'lucide-react';
// import { MOCK_VENDORS } from '@/lib/mockData';
//
// export function NearbyVendors() {
//     const mobileVendors = MOCK_VENDORS.slice(0, 6);
//
//     return (
//         <section id="vendors" className="w-full py-4 bg-white">
//             <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
//                 <div className="flex items-center justify-between mb-4">
//                     <div>
//                         <h2 className="text-[16px] md:text-[18px] lg:text-[22px] font-bold text-[#181725]">Vendors Near You</h2>
//                         <p className="text-[11px] md:text-[12px] text-gray-400 font-medium mt-0.5">Delivering to your area</p>
//                     </div>
//                     <span className="text-[12px] font-semibold text-[#299e60] cursor-pointer hover:underline transition-all">See all</span>
//                 </div>
//
//                 {/* Mobile: 1 col, max 6 vendors */}
//                 <div className="grid grid-cols-1 gap-3 md:hidden">
//                     {mobileVendors.map((vendor) => ( ... vendor card ... ))}
//                 </div>
//
//                 {/* Tablet: 2 cols, all vendors */}
//                 <div className="hidden md:grid xl:hidden grid-cols-2 gap-3 md:gap-4">
//                     {MOCK_VENDORS.map((vendor) => ( ... vendor card ... ))}
//                 </div>
//
//                 {/* Desktop: 4 cols, all vendors */}
//                 <div className="hidden xl:grid grid-cols-4 gap-4">
//                     {MOCK_VENDORS.map((vendor) => ( ... vendor card ... ))}
//                 </div>
//             </div>
//         </section>
//     );
// }
//
// Each vendor card had:
// - w-14 h-14 logo with rounded-xl
// - vendor name, categories
// - Star rating, Clock delivery time, Package min order, CreditCard credit badge
// ==========================================================================
