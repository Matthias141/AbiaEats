import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Outfit, Playfair_Display } from "next/font/google";
import { CartProvider } from "@/contexts/cart-context";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AbiaEats - Food Delivery in Aba & Umuahia",
    template: "%s | AbiaEats",
  },
  description:
    "Order delicious food from the best restaurants in Aba and Umuahia, Abia State. Fast delivery, verified payments, local flavors.",
  keywords: [
    "food delivery",
    "Aba",
    "Umuahia",
    "Abia State",
    "Nigerian food",
    "restaurant",
    "order food online",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AbiaEats",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFFFFF",
};

// Nonce-based CSP (src/lib/supabase/middleware.ts) generates a fresh random
// nonce per request. A statically prerendered page bakes in whatever nonce
// was present at build time, which can never match a freshly-generated
// per-request nonce — every inline hydration script gets blocked and the
// page never becomes interactive. Force dynamic rendering everywhere so the
// nonce baked into the HTML always matches the one in that request's CSP
// header.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${playfair.variable} ${jetBrainsMono.variable} font-body antialiased bg-white text-gray-900 overflow-x-hidden`}
      >
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
