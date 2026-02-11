import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
});

import { Inter } from "next/font/google";
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HorecaHub - B2B E-commerce for Restaurant Products",
  description: "High speed, optimized B2B platform for restaurant and eating products.",
};

import { CartProvider } from "@/context/CartContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${quicksand.variable} ${inter.variable} font-sans antialiased bg-background`}>
        <CartProvider>
          <Navbar />
          <main className="w-full min-h-screen pb-20 md:pb-0">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

