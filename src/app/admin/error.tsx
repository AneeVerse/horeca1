'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          Admin panel error
        </h2>
        <p className="text-gray-600 mb-6">
          Something went wrong loading this admin page. Please try again.
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
