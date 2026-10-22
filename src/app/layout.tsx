import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { PageTracker } from "@/components/Track";
import { SITE } from "@/lib/site";
import "./globals.css";

// Fonts are bundled (OFL licensed) so builds never depend on reaching Google Fonts.
const inter = localFont({ src: "../fonts/inter-latin-wght-normal.woff2", variable: "--font-inter", weight: "100 900", display: "swap" });
// Fraunces: an editorial serif for headings — Rishikesh is an arts town, the type should feel like it.
const display = localFont({
  src: [
    { path: "../fonts/fraunces-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/fraunces-latin-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-display",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} ${SITE.place} — what's on in Tapovan`, template: `%s · ${SITE.name} ${SITE.place}` },
  description: SITE.description,
  openGraph: { siteName: `${SITE.name} ${SITE.place}`, type: "website" },
  appleWebApp: { title: SITE.name, capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#15130f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="no-print sticky top-0 z-[1000] bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
            <Link href="/" aria-label={`${SITE.name} home`}>
              <Logo />
            </Link>
            <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
              <Link href="/today" className="rounded-full px-3 py-2 text-ink-2 hover:bg-paper-2">
                Today
              </Link>
              <Link href="/alerts" className="rounded-full px-3 py-2 text-ink-2 hover:bg-paper-2">
                Alerts
              </Link>
              <Link
                href="/post"
                className="rounded-full bg-saffron px-4 py-2 text-white shadow-card transition hover:brightness-105 active:scale-[.98]"
              >
                Post a flyer
              </Link>
            </nav>
          </div>
          <div className="h-[3px] bg-gradient-to-r from-river-1 via-river-2 to-river-1 opacity-80" aria-hidden />
        </header>
        <main className="flex-1">{children}</main>
        <Suspense fallback={null}>
          <PageTracker />
        </Suspense>
        <footer className="no-print mt-10 text-sm">
          <div className="bg-river-deep text-[#e9f6f3]">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6">
              <span className="font-semibold">
                {SITE.name} {SITE.place} · made beside the Ganga in Tapovan
              </span>
              <Link href="/today" className="text-[#a9d6cf] hover:text-white">
                Today
              </Link>
              <Link href="/about" className="text-[#a9d6cf] hover:text-white">
                How it works
              </Link>
              <Link href="/about#organisers" className="text-[#a9d6cf] hover:text-white">
                For organisers
              </Link>
              <Link href="/poster" className="text-[#a9d6cf] hover:text-white">
                Cafe poster
              </Link>
              <Link href="/admin" className="ml-auto text-[#a9d6cf] opacity-70 hover:text-white">
                Admin
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
