"use client";

import { gsap, MOTION, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";

/** Only content the visitor hasn't seen yet gets a reveal; anything already on
 *  screen (or scrolled past, e.g. when landing on /#marcar) is left alone. */
const belowFold = (el: Element) => el.getBoundingClientRect().top > window.innerHeight;

/** Reveals are short and travel little: they should ease content in, not make
 *  the visitor wait for it. */
const REVEAL = { opacity: 0, y: 16 } as const;

/**
 * Scroll reveals, driven by data attributes so the sections can stay server
 * components (the hero intro is plain CSS, see globals.css):
 *
 * - `data-reveal` — fades up once when scrolled into view.
 * - `data-reveal-group` — its direct children fade up in a stagger.
 * - `data-reveal-bar` — the gradient underline grows from the centre.
 *
 * Nothing runs when the visitor prefers reduced motion, and content is never
 * hidden before this script runs.
 */
export function PageMotion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(MOTION_OK, () => {
      gsap.utils
        .toArray<HTMLElement>("[data-reveal]")
        .filter(belowFold)
        .forEach((el) => {
          gsap.from(el, {
            ...REVEAL,
            duration: MOTION.slow,
            ease: MOTION.easeOut,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

      gsap.utils
        .toArray<HTMLElement>("[data-reveal-bar]")
        .filter(belowFold)
        .forEach((el) => {
          gsap.from(el, {
            scaleX: 0,
            duration: MOTION.slow,
            ease: MOTION.easeOut,
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
          });
        });

      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
        const items = Array.from(group.children).filter(belowFold);
        if (items.length === 0) return;
        gsap.set(items, REVEAL);
        ScrollTrigger.batch(items, {
          start: "top 92%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: MOTION.slow,
              ease: MOTION.easeOut,
              stagger: MOTION.stagger,
              overwrite: "auto",
            }),
        });
      });
    });

    return () => mm.revert();
  });

  return null;
}
