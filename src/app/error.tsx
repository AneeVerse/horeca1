'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-gray-900 mb-3">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-6 text-[clamp(0.875rem,2vw,1rem)]">
          We encountered an unexpected error. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-orange-500 px-6 py-3 text-white font-medium hover:bg-orange-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
