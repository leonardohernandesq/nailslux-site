import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Client-only: import from "use client" components. Registering here keeps the
// plugins in one place, so every component shares the same GSAP instance.
gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Shared motion tokens, so every animation on the site has the same rhythm. */
export const MOTION = {
  fast: 0.22,
  base: 0.45,
  slow: 0.8,
  stagger: 0.08,
  easeOut: "power3.out",
  easeIn: "power2.in",
} as const;

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger, useGSAP };
