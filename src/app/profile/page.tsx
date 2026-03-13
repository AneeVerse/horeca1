'use client';

import React, { useState, useEffect } from 'react';
import { ProfileScreen } from '@/components/auth/ProfileScreen';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(true); // Mocking login state for now

    // In a real app, you would check auth state here
    
    return (
        <main className="min-h-screen bg-[#F2F3F2]">
            <ProfileScreen 
                isOpen={true} 
                onClose={() => {
                    if (window.history.length > 1) {
                        router.back();
                    } else {
                        router.push('/');
                    }
                }} 
            />
        </main>
    );
}
