"use client";

import { gsap, MOTION, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";

/** Only content the visitor hasn't seen yet gets a reveal; anything already on
 *  screen (or scrolled past, e.g. when landing on /#marcar) is left alone. */
const belowFold = (el: Element) => el.getBoundingClientRect().top > window.innerHeight;

/**
 * Page-wide GSAP animations, driven by data attributes so the sections can stay
 * server components:
 *
 * - `data-hero="item" | "image" | "fox"` — intro sequence on load.
 * - `data-reveal` — fades up once when scrolled into view.
 * - `data-reveal-group` — its direct children fade up in a stagger.
 * - `data-reveal-bar` — the gradient underline grows from the centre.
 *
 * Nothing runs when the visitor prefers reduced motion, and the content is fully
 * visible without JavaScript (the hero pre-hide in globals.css only applies when
 * scripting is enabled, and has a timed fallback).
 */
export function PageMotion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(MOTION_OK, () => {
      gsap
        .timeline({ defaults: { ease: MOTION.easeOut } })
        // The photo leads (it sits on top on phones), then the text follows it in.
        .fromTo(
          "[data-hero='image']",
          { opacity: 0, scale: 0.92, y: 24 },
          { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: "expo.out" },
          0,
        )
        .fromTo(
          "[data-hero='item']",
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: MOTION.slow, stagger: 0.1 },
          0.15,
        )
        .fromTo(
          "[data-hero='fox']",
          { opacity: 0, y: 30, rotate: -14 },
          { opacity: 1, y: 0, rotate: 0, duration: 0.9, ease: "back.out(2)" },
          0.55,
        )
        // A slow, subtle float keeps the mascot alive after the intro.
        .to("[data-hero='fox']", { y: -8, duration: 2.6, ease: "sine.inOut", repeat: -1, yoyo: true });

      gsap.utils
        .toArray<HTMLElement>("[data-reveal]")
        .filter(belowFold)
        .forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 32,
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
            ease: "power2.inOut",
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
          });
        });

      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
        const items = Array.from(group.children).filter(belowFold);
        if (items.length === 0) return;
        gsap.set(items, { opacity: 0, y: 36 });
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
