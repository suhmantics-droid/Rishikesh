import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SITE } from "@/lib/site";
import "./globals.css";

// Fonts are bundled (OFL licensed) so builds never depend on reaching Google Fonts.
const inter = localFont({ src: "../fonts/inter-latin-wght-normal.woff2", variable: "--font-inter", weight: "100 900", display: "swap" });
const display = localFont({
  src: "../fonts/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-display",
  weight: "200 800",
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
        <header className="no-print sticky top-0 z-[1000] border-b border-line/70 bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
            <Link href="/" aria-label={`${SITE.name} home`}>
              <Logo />
            </Link>
            <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
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
        </header>
        <main className="flex-1">{children}</main>
        <footer className="no-print border-t border-line/70 text-sm text-muted">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6">
            <span>
              {SITE.name} {SITE.place} · {SITE.tagline}
            </span>
            <Link href="/about" className="hover:text-ink">
              How it works
            </Link>
            <Link href="/about#organisers" className="hover:text-ink">
              For organisers
            </Link>
            <Link href="/poster" className="hover:text-ink">
              Cafe poster
            </Link>
            <Link href="/admin" className="ml-auto opacity-60 hover:text-ink">
              Admin
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
