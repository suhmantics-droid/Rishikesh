import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (includes libsql and sharp). Vercel bundles its own way.
  output: process.env.VERCEL ? undefined : "standalone",
  // The QR reader is WebAssembly loaded from disk at runtime; keep it out of the bundle and in the image.
  serverExternalPackages: ["zxing-wasm"],
  // Files read from disk at runtime, which the bundler can't see: the QR reader, the share-image fonts,
  // and the starter flyers (admin only).
  outputFileTracingIncludes: {
    "/api/uploads": ["./node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"],
    "/opengraph-image": ["./assets/fonts/**"],
    "/today/og": ["./assets/fonts/**"],
    "/today/story": ["./assets/fonts/**"],
    "/admin": ["./seed/starter/**"],
    "/api/admin/starter/[file]": ["./seed/starter/**"],
  },
  // A short link for snapping flyers on a walk: the admin's photo queue (it asks for the password once).
  async redirects() {
    return [{ source: "/drop", destination: "/admin?tab=queue#photos", permanent: false }];
  },
  cacheComponents: true,
  experimental: {
    // Tapovan's internet drops a lot: keep taps pending and retry them when the connection returns.
    useOffline: true,
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
