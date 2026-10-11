import type { NextConfig } from "next";
import { MAX_UPLOAD_BYTES } from "./lib/constants";

const nextConfig: NextConfig = {
  // Lets the e2e server build into its own folder, so it never clashes with `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    agentFeedback: true,
    serverActions: {
      // One photo per request, plus room for multipart overhead.
      bodySizeLimit: MAX_UPLOAD_BYTES + 512 * 1024,
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      { pathname: "/brand/**", search: "" },
      { pathname: "/api/images/**", search: "" },
    ],
  },
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
