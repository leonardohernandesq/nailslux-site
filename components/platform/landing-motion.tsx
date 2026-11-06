"use client";

import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";

const FINE_POINTER = `${MOTION_OK} and (pointer: fine)`;

/**
 * The landing page's motion, driven by data attributes so the sections can stay
 * server components. Everything here is decoration: the page reads the same
 * without JS, and nothing runs for visitors who prefer reduced motion.
 *
 * - `data-scroll-grow`: settles into place as it scrolls into view.
 * - `data-count`: counts up from 0 to the number it already shows.
 * - `data-marquee`: the CSS ribbon speeds up while the page scrolls.
 * - `data-sheen`: a light band crosses it while it scrolls past.
 * - `data-magnetic`, `data-tilt`, `data-spotlight`, `data-cursor-glow`: follow
 *   the pointer, on devices with a mouse only.
 */
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

      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count);
        const decimals = Number(el.dataset.countDecimals ?? 0);
        const format = (value: number) => value.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        const counter = { value: 0 };
        gsap.to(counter, {
          value: target,
          duration: 1.6,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onStart: () => void (el.textContent = format(0)),
          onUpdate: () => void (el.textContent = format(counter.value)),
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-sheen]").forEach((el) => {
        gsap.fromTo(
          el,
          { "--sheen": "150%" },
          { "--sheen": "-50%", ease: "none", scrollTrigger: { trigger: el, start: "top 85%", end: "bottom 15%", scrub: true } },
        );
      });

      // The ribbon is a CSS animation; scrolling only changes its playback rate.
      const ribbon = document.querySelector<HTMLElement>("[data-marquee]")?.getAnimations()[0];
      if (ribbon) {
        const speed = { rate: 1 };
        const apply = () => (ribbon.playbackRate = speed.rate);
        ScrollTrigger.create({
          onUpdate: (self) => {
            speed.rate = 1 + Math.min(Math.abs(self.getVelocity()) / 350, 5);
            apply();
            gsap.to(speed, { rate: 1, duration: 1.2, ease: "power2.out", overwrite: true, onUpdate: apply });
          },
        });
      }
    });

    mm.add(FINE_POINTER, () => {
      const cleanups: (() => void)[] = [];
      const listen = (el: HTMLElement, type: "pointermove" | "pointerleave", handler: (event: PointerEvent) => void) => {
        el.addEventListener(type, handler);
        cleanups.push(() => el.removeEventListener(type, handler));
      };

      gsap.utils.toArray<HTMLElement>("[data-magnetic]").forEach((el) => {
        const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
        const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
        listen(el, "pointermove", (event) => {
          const box = el.getBoundingClientRect();
          x((event.clientX - box.left - box.width / 2) * 0.25);
          y((event.clientY - box.top - box.height / 2) * 0.35);
        });
        listen(el, "pointerleave", () => {
          x(0);
          y(0);
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-tilt]").forEach((el) => {
        const max = Number(el.dataset.tilt || 6);
        gsap.set(el, { transformPerspective: 900 });
        const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
        const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
        listen(el, "pointermove", (event) => {
          const box = el.getBoundingClientRect();
          ry(((event.clientX - box.left) / box.width - 0.5) * 2 * max);
          rx(-((event.clientY - box.top) / box.height - 0.5) * 2 * max);
        });
        listen(el, "pointerleave", () => {
          rx(0);
          ry(0);
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-spotlight]").forEach((el) => {
        listen(el, "pointermove", (event) => {
          const box = el.getBoundingClientRect();
          el.style.setProperty("--mx", `${event.clientX - box.left}px`);
          el.style.setProperty("--my", `${event.clientY - box.top}px`);
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-cursor-glow]").forEach((area) => {
        const glow = area.querySelector<HTMLElement>("[data-cursor-glow-dot]");
        if (!glow) return;
        const x = gsap.quickTo(glow, "x", { duration: 0.9, ease: "power3.out" });
        const y = gsap.quickTo(glow, "y", { duration: 0.9, ease: "power3.out" });
        listen(area, "pointermove", (event) => {
          const box = area.getBoundingClientRect();
          gsap.to(glow, { autoAlpha: 1, duration: 0.4, overwrite: "auto" });
          x(event.clientX - box.left);
          y(event.clientY - box.top);
        });
        listen(area, "pointerleave", () => gsap.to(glow, { autoAlpha: 0, duration: 0.6, overwrite: "auto" }));
      });

      return () => cleanups.forEach((cleanup) => cleanup());
    });

    return () => mm.revert();
  });

  return null;
}
