"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { formatPrice } from "@/lib/format";
import { gsap, MOTION, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { useBooking } from "./booking-context";

/** Mobile-only reminder of what's chosen, with a shortcut to the booking form. */
export function SelectionBar({ targetId = "marcar" }: { targetId?: string }) {
  const { services, selectedIds } = useBooking();
  const [targetVisible, setTargetVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const count = selectedIds.length;
  const shown = count > 0 && !targetVisible;

  // Hide the bar once the booking form is on screen, so it never covers it.
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setTargetVisible(entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  // Slide up when the bar appears, and give the count a nudge when it changes.
  const wasShown = useRef(false);
  useGSAP(
    () => {
      if (!shown || !barRef.current || prefersReducedMotion()) {
        wasShown.current = shown;
        return;
      }
      if (!wasShown.current) {
        gsap.fromTo(
          barRef.current,
          { yPercent: 120, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: MOTION.base, ease: "back.out(1.4)" },
        );
      } else {
        gsap.fromTo("[data-bar-count]", { scale: 1.25 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
      }
      wasShown.current = true;
    },
    { dependencies: [shown, count], scope: barRef },
  );

  if (!shown) return null;

  const total = services
    .filter((service) => selectedIds.includes(service.id))
    .reduce((sum, service) => sum + service.priceCents, 0);

  return (
    <div ref={barRef} className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
      <a
        href={`#${targetId}`}
        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-ink px-5 text-cream shadow-lift"
      >
        <span className="text-sm">
          <span data-bar-count className="inline-block font-bold">
            {count} {count === 1 ? "serviço" : "serviços"}
          </span>{" "}
          · <span className="tabular-nums">{formatPrice(total)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          Marcar
          <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
        </span>
      </a>
    </div>
  );
}
