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

  const total = services
    .filter((service) => selectedIds.includes(service.id))
    .reduce((sum, service) => sum + service.priceCents, 0);

  // Keep showing the last real selection while the bar slides away, instead of "0 serviços".
  const [summary, setSummary] = useState({ count, total });
  if (count > 0 && (summary.count !== count || summary.total !== total)) {
    setSummary({ count, total });
  }

  // Give the count a nudge when it changes while the bar is up. Showing and hiding is
  // a CSS transition, so it can reverse mid-way when the visitor scrolls back and forth.
  const previousCount = useRef(count);
  useGSAP(
    () => {
      const changed = previousCount.current !== count;
      previousCount.current = count;
      if (!changed || !shown || prefersReducedMotion()) return;
      gsap.fromTo("[data-bar-count]", { scale: 1.12 }, { scale: 1, duration: 0.3, ease: MOTION.easeOut });
    },
    { dependencies: [count], scope: barRef },
  );

  return (
    <div
      ref={barRef}
      // `invisible` takes it out of the tab order and accessibility tree once hidden.
      className={`fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-[translate,opacity,visibility] md:hidden ${
        shown
          ? "duration-300 ease-(--ease-out-soft)"
          : "invisible translate-y-full opacity-0 duration-200 ease-in"
      }`}
    >
      <a
        href={`#${targetId}`}
        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-ink px-5 text-cream shadow-lift"
      >
        <span className="text-sm">
          <span data-bar-count className="inline-block font-bold">
            {summary.count} {summary.count === 1 ? "serviço" : "serviços"}
          </span>{" "}
          · <span className="tabular-nums">{formatPrice(summary.total)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          Marcar
          <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
        </span>
      </a>
    </div>
  );
}
