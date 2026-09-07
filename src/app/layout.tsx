import { Suspense } from "react";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Cormorant_Garamond, Kaushan_Script, Manrope } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import CartDrawer from "@/components/cart/CartDrawer";
import RegionMismatchBanner from "@/components/layout/RegionMismatchBanner";
import BackToTop from "@/components/layout/BackToTop";
import RouteProgressBar from "@/components/layout/RouteProgressBar";
import WhatsAppFAB from "@/components/layout/WhatsAppFAB";
import { SITE_CONFIG, IS_CANONICAL_DOMAIN } from "@/lib/config";
import { RegionProvider } from "@/lib/regionContext";
import type { RegionId } from "@/lib/region";

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
    default: `${SITE_CONFIG.name} | Composed for character.`,
    template: `%s · ${SITE_CONFIG.name}`,
  },
  description:
    "A luxury house of fragrance composing scents that leave impact. Oud, oriental, and bespoke creations.",
  metadataBase: new URL(SITE_CONFIG.url),
  // robots.txt is only a crawl hint — a page linked from elsewhere can still be
  // indexed. noindex is the actual guarantee, so pre-launch and preview builds
  // emit it too. Clears itself once the canonical domain is live.
  robots: IS_CANONICAL_DOMAIN ? undefined : { index: false, follow: false },
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
  const cookieValue = cookies().get('impact_region')?.value;
  const initialRegionId: RegionId | undefined =
    cookieValue === 'NG' || cookieValue === 'CA' ? cookieValue : undefined;

  return (
    <html lang="en" className={`${cormorant.variable} ${kaushan.variable} ${manrope.variable}`}>
      <body className="bg-ink text-bone font-sans antialiased flex flex-col min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-accent focus:px-4 focus:py-2 focus:text-label focus:uppercase focus:tracking-[0.08em] focus:text-ink"
        >
          Skip to content
        </a>
        <RegionProvider initialRegionId={initialRegionId}>
          <Suspense fallback={null}>
            <RouteProgressBar />
          </Suspense>
          <SiteHeader />
          <main id="main-content" className="flex-1">{children}</main>
          <SiteFooter />
          <CartDrawer />
          <BackToTop />
          <WhatsAppFAB />
          <RegionMismatchBanner />
        </RegionProvider>
      </body>
    </html>
  );
}
