import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-[clamp(3rem,8vw,5rem)] font-bold text-gray-200 mb-2">404</h1>
        <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-bold text-gray-900 mb-3">
          Page not found
        </h2>
        <p className="text-gray-600 mb-6 text-[clamp(0.875rem,2vw,1rem)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-orange-500 px-6 py-3 text-white font-medium hover:bg-orange-600 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
