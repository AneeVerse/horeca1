'use client';

import { use } from 'react';
import { BrandStore } from '@/components/features/brand/BrandStore';

export default function BrandStorePage({ params }: { params: Promise<{ brandId: string }> }) {
    const { brandId } = use(params);
    return <BrandStore brandId={brandId} />;
}
