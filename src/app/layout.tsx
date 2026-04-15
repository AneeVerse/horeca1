import React, { Suspense } from 'react';
import type { Metadata } from "next";
import { Quicksand, Poppins } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Inter, Playfair_Display } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import { GoogleMapsProvider } from "@/components/providers/GoogleMapsProvider";
import { AddressProvider } from "@/context/AddressContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { VendorApplicationBanner } from '@/components/features/homepage/VendorApplicationBanner';

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "HorecaHub - B2B E-commerce for Restaurant Products",
  description: "High speed, optimized B2B platform for restaurant and eating products.",
  icons: {
    icon: "/horeca1_logo.jpg",
    shortcut: "/horeca1_logo.jpg",
    apple: "/horeca1_logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${quicksand.variable} ${inter.variable} ${poppins.variable} ${playfair.variable} font-sans antialiased bg-background`}>
        <AuthProvider>
        <GoogleMapsProvider>
          <AddressProvider>
            <WishlistProvider>
              <CartProvider>
                <ConfirmProvider>
                  <Toaster position="top-center" richColors />
                  <Navbar />
                  <VendorApplicationBanner />
                  <main className="w-full min-h-screen pb-20 md:pb-0">
                    {children}
                  </main>
                  <Footer />
                </ConfirmProvider>
              </CartProvider>
          </WishlistProvider>
        </AddressProvider>
        </GoogleMapsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
