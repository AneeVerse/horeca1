import React, { Suspense } from 'react';
import type { Metadata } from "next";
import { Quicksand, Poppins } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Inter } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import { GoogleMapsProvider } from "@/components/providers/GoogleMapsProvider";
import { AddressProvider } from "@/context/AddressContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from 'sonner';

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

export const metadata: Metadata = {
  title: "HorecaHub - B2B E-commerce for Restaurant Products",
  description: "High speed, optimized B2B platform for restaurant and eating products.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${quicksand.variable} ${inter.variable} ${poppins.variable} font-sans antialiased bg-background`}>
        <AuthProvider>
        <GoogleMapsProvider>
          <AddressProvider>
            <WishlistProvider>
              <CartProvider>
                <Toaster position="top-center" richColors />
              <Navbar />
              <main className="w-full min-h-screen pb-20 md:pb-0">
                {children}
              </main>
              <Footer />
            </CartProvider>
          </WishlistProvider>
        </AddressProvider>
        </GoogleMapsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
