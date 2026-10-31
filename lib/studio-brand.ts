import type { TenantDTO } from "./data/tenants";
import { hasBrandAssets } from "./site";
import heroImage from "@/public/brand/hero-hands.webp";

/**
 * What a studio's site shows: what the studio uploaded, falling back to the images
 * in the code for studios that have them. The rest simply show their name.
 */
export function studioBrand({ slug, brand }: Pick<TenantDTO, "slug" | "brand">) {
  const builtIn = hasBrandAssets(slug);
  return {
    logo: brand.logo ?? (builtIn ? { src: "/brand/logo-wordmark.png", width: 1000, height: 288 } : null),
    banner: brand.banner ?? (builtIn ? { src: heroImage } : null),
    icon: brand.iconSrc ?? (builtIn ? "/brand/studio-icon.png" : null),
    appleIcon: brand.iconSrc ?? (builtIn ? "/brand/studio-apple-icon.png" : null),
    shareImage: brand.logo ?? (builtIn ? { src: "/brand/logo-full.png", width: 900, height: 587 } : null),
    mascot: builtIn,
  };
}

export type StudioBrand = ReturnType<typeof studioBrand>;
