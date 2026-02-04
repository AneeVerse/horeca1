import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
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
      <body className={`${quicksand.variable} font-sans antialiased bg-background`}>
        <Navbar />
        <main className="w-full min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
