"use client";

import { useRef } from "react";
import { CheckIcon, PlusIcon } from "@phosphor-icons/react";
import { buttonClasses } from "@/components/ui/button";
import { gsap, MOTION, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { useBooking } from "./booking-context";

export function ServiceSelectButton({ id, name }: { id: string; name: string }) {
  const { isSelected, toggle, askToBook } = useBooking();
  const selected = isSelected(id);
  const iconRef = useRef<HTMLSpanElement>(null);
  const firstRender = useRef(true);

  // Ease the new icon in whenever the state flips (plus <-> check). The button itself
  // has a CSS scale transition on press, so the icon gets the motion instead of fighting it.
  useGSAP(
    () => {
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        iconRef.current,
        { opacity: 0, scale: 0.6, filter: "blur(2px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.25, ease: MOTION.easeOut, overwrite: true },
      );
    },
    { dependencies: [selected] },
  );

  return (
    <button
      type="button"
      onClick={() => {
        toggle(id);
        if (!selected) askToBook(id);
      }}
      data-selected={selected || undefined}
      // Starts with the visible text, so voice-control users can say what they see.
      aria-label={`${selected ? "Escolhido" : "Escolher"} ${name}`}
      className={buttonClasses({
        variant: selected ? "primary" : "secondary",
        size: "sm",
        className: "w-full sm:w-auto",
      })}
    >
      <span ref={iconRef} className="inline-flex">
        {selected ? (
          <CheckIcon size={18} weight="bold" aria-hidden="true" />
        ) : (
          <PlusIcon size={18} weight="bold" aria-hidden="true" />
        )}
      </span>
      {selected ? "Escolhido" : "Escolher"}
    </button>
  );
}
