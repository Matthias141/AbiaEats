import type { Metadata, Viewport } from "next";
import { CartProvider } from "@/contexts/cart-context";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-white text-gray-900 overflow-x-hidden">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
