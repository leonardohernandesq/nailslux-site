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

/** A mold is one size per finger (or toe), stored as "3-6-5-7-9". */
export const MOLD_DIGITS = 5;
export const MOLD_MAX_SIZE = 20;

/** Per tenant, so a change in one studio never touches another's cached pages. */
export const CACHE_TAGS = {
  tenant: (slug: string) => `tenant:${slug}`,
  services: (tenantId: string) => `services:${tenantId}`,
  portfolio: (tenantId: string) => `portfolio:${tenantId}`,
};

export const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/** Slugs a studio can't take because platform pages live at those URLs. */
export const RESERVED_SLUGS = ["admin", "api", "backoffice", "brand", "login", "planos", "recuperar", "registo", "termos", "privacidade"];
