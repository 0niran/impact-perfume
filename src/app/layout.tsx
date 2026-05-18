import { Suspense } from "react";
import type { Metadata } from "next";
import { Cormorant_Garamond, Kaushan_Script, Manrope } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import CartDrawer from "@/components/cart/CartDrawer";
import BackToTop from "@/components/layout/BackToTop";
import RouteProgressBar from "@/components/layout/RouteProgressBar";
import WhatsAppFAB from "@/components/layout/WhatsAppFAB";
import { SITE_CONFIG } from "@/lib/config";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-display",
  display: "swap",
});

const kaushan = Kaushan_Script({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-brand",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.name} | Crafted in Lagos. Composed for character.`,
    template: `%s · ${SITE_CONFIG.name}`,
  },
  description:
    "A Lagos house of fragrance composing scents that leave impact. Oud, oriental, and bespoke creations.",
  metadataBase: new URL(SITE_CONFIG.url),
  openGraph: {
    type: "website",
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${kaushan.variable} ${manrope.variable}`}>
      <body className="bg-ink text-bone font-sans antialiased flex flex-col min-h-screen">
        {/* Skip to main content — keyboard navigation */}
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-full bg-accent px-4 py-2 text-label uppercase tracking-[0.08em] text-ink transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <SiteHeader />
        <main id="main-content" className="flex-1">{children}</main>
        <SiteFooter />
        <CartDrawer />
        <BackToTop />
        <WhatsAppFAB />
      </body>
    </html>
  );
}
