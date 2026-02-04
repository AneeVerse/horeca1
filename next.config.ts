import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React Compiler for automatic optimizations
  reactCompiler: true,
  
  // Enable strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Compress responses
  compress: true,
  
  // Generate ETags for caching
  generateEtags: true,
  
  // Powered by header (disable for security)
  poweredByHeader: false,
  
  // Experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', 'react-icons'],
  },
};

export default nextConfig;
