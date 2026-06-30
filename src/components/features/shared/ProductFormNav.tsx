'use client';

import { cn } from '@/lib/utils';

export interface ProductFormNavSection {
  id: string;
  label: string;
}

interface ProductFormNavProps {
  sections: ProductFormNavSection[];
  className?: string;
}

export function scrollToProductFormSection(sectionId: string) {
  const el = document.getElementById(`section-${sectionId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default function ProductFormNav({ sections, className }: ProductFormNavProps) {
  return (
    <nav
      className={cn(
        'hidden lg:block w-[200px] shrink-0 sticky top-4 self-start',
        className,
      )}
      aria-label="Form sections"
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#AEAEAE] mb-3 px-1">
        On this page
      </p>
      <ul className="space-y-0.5">
        {sections.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => scrollToProductFormSection(s.id)}
              className="w-full text-left px-3 py-2 rounded-[8px] text-[12px] font-semibold text-[#7C7C7C] hover:bg-white hover:text-[#299E60] transition-colors"
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export const ADMIN_PRODUCT_FORM_SECTIONS: ProductFormNavSection[] = [
  { id: 'essentials', label: 'Product essentials' },
  { id: 'vendor', label: 'Vendor assignment' },
  { id: 'status', label: 'Status & availability' },
  { id: 'pricing', label: 'Pricing & tax' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'identifiers', label: 'Additional identifiers' },
  { id: 'details', label: 'Additional details' },
  { id: 'bulk', label: 'Bulk pricing tiers' },
];

export const VENDOR_PRODUCT_FORM_SECTIONS: ProductFormNavSection[] = [
  { id: 'essentials', label: 'Product essentials' },
  { id: 'status', label: 'Status & availability' },
  { id: 'pricing', label: 'Pricing & tax' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'identifiers', label: 'Additional identifiers' },
  { id: 'details', label: 'Additional details' },
  { id: 'bulk', label: 'Bulk pricing tiers' },
];
