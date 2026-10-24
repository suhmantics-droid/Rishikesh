import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (includes better-sqlite3 and sharp).
  output: "standalone",
  // The QR reader is WebAssembly loaded from disk at runtime; keep it out of the bundle and in the image.
  serverExternalPackages: ["zxing-wasm"],
  outputFileTracingIncludes: {
    "/api/uploads": ["./node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"],
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
