'use client';

import React from 'react';
import { ProfileScreen } from '@/components/auth/ProfileScreen';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-[#F2F3F2]">
            <ProfileScreen 
                isOpen={true} 
                onClose={() => {
                    router.push('/');
                }} 
            />
        </main>
    );
}
