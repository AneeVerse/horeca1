'use client';

import { Suspense } from 'react';
import LoginPageInner from './LoginPageInner';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
