"use client";

import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

/** `data-scroll-grow`: the element settles into place as it scrolls into view. */
export function LandingMotion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.utils.toArray<HTMLElement>("[data-scroll-grow]").forEach((el) => {
        gsap.from(el, {
          scale: 0.88,
          y: 40,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 95%", end: "top 45%", scrub: 0.6 },
        });
      });
    });
    return () => mm.revert();
  });

  return null;
}
