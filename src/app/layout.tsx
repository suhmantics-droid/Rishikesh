import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { OfflineBanner, ServiceWorker } from "@/components/Offline";
import { TabBar, TabBarView, TopNav, TopNavView } from "@/components/Nav";
import { Icon } from "@/components/Icon";
import { PageTracker } from "@/components/Track";
import { SITE } from "@/lib/site";
import "./globals.css";

// Fonts are bundled (OFL licensed) so builds never depend on reaching Google Fonts.
// Anek Latin: one variable family (weight and width) for everything. Its width axis lets a long
// venue name narrow before it wraps.
const anek = localFont({
  src: "../fonts/anek-latin-standard.woff2",
  variable: "--font-anek",
  weight: "100 800",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "75% 125%" }],
});
// Anek Devanagari, cut down to the handful of Hindi labels the interface uses (सुबह, शाम, आज रात…).
// Devanagari in flyer titles uses the phone's own Devanagari font instead.
const hiLabels = localFont({ src: "../fonts/anek-devanagari-labels.woff2", variable: "--font-hi-labels", weight: "700", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: what's on in Tapovan, Rishikesh`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: { siteName: SITE.name, type: "website" },
  appleWebApp: { title: SITE.name, capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eae8e3" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1916" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anek.variable} ${hiLabels.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-wall pb-[calc(76px+env(safe-area-inset-bottom))] text-ink lg:pb-0">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[2000] focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="no-print sticky top-0 z-[1000] border-b border-line bg-wall/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:h-20 lg:gap-10 lg:px-12">
            <Link href="/" aria-label={`${SITE.name} home`} className="flex min-h-11 items-center">
              <Logo />
            </Link>
            <Suspense fallback={<TopNavView active={null} />}>
              <TopNav />
            </Suspense>
            <div className="ml-auto flex items-center gap-1.5">
              <Link href="/flyers#search" aria-label="Search all flyers" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-wall-2">
                <Icon name="search" size={22} />
              </Link>
              <Link
                href="/post"
                className="flex min-h-11 items-center rounded-full border-[1.5px] border-ink px-4 text-[16px] font-bold whitespace-nowrap hover:bg-ink hover:text-wall"
              >
                Post<span className="hidden sm:inline">&nbsp;a flyer</span>
              </Link>
            </div>
          </div>
          <OfflineBanner />
        </header>
        <ServiceWorker />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Suspense fallback={null}>
          <PageTracker />
        </Suspense>
        <footer className="no-print mt-12 border-t border-line text-[15px]">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 lg:flex-row lg:items-center lg:gap-6 lg:px-12">
            <span className="font-bold">{SITE.name} · made beside the Ganga in Tapovan</span>
            <nav aria-label="More" className="flex flex-wrap gap-x-5 gap-y-1 text-ink-2">
              <Link href="/about" className="min-h-11 content-center hover:text-ink">About</Link>
              <Link href="/about#organisers" className="min-h-11 content-center hover:text-ink">For organisers</Link>
              <Link href="/today" className="min-h-11 content-center hover:text-ink">Today&apos;s list</Link>
            </nav>
            <p className="text-[14px] text-muted lg:ml-auto">Listed, not endorsed: we check each flyer&apos;s details, not the event itself.</p>
          </div>
        </footer>
        <Suspense fallback={<TabBarView active={null} />}>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}
