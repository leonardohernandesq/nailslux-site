// Shared limits used by both client and server validation.

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB per photo

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/** Longest edge, in pixels, of portfolio photos after processing. */
export const PORTFOLIO_MAX_EDGE = 1600;

/** Most photos the portfolio holds; the admin removes one to add another. */
export const PORTFOLIO_MAX_ITEMS = 30;

export const CACHE_TAGS = {
  services: "services",
  portfolio: "portfolio",
} as const;
