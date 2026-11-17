/**
 * Sign-up links that belong to a partner rather than a studio: /registo?ref=<code>.
 * The new studio gets the same free month as through a studio's link; the partner
 * has no subscription, so nothing is extended on their side. Each code must also be
 * in RESERVED_SLUGS, so no studio can take it as its address.
 */
export const PARTNERS = [{ code: "markaii", name: "Markaii" }] as const;

export type Partner = (typeof PARTNERS)[number];

export const findPartner = (code: unknown): Partner | null => PARTNERS.find((partner) => partner.code === code) ?? null;
