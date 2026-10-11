"use client";

import { useRef } from "react";
import { CheckIcon, PlusIcon } from "@phosphor-icons/react";
import { buttonClasses } from "@/components/ui/button";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { useBooking } from "./booking-context";

export function ServiceSelectButton({ id, name }: { id: string; name: string }) {
  const { isSelected, toggle, askToBook } = useBooking();
  const selected = isSelected(id);
  const iconRef = useRef<HTMLSpanElement>(null);
  const firstRender = useRef(true);

  // Pop the icon whenever the state flips. The button itself has a CSS transform
  // transition, so the icon gets the motion instead of fighting it.
  useGSAP(
    () => {
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        iconRef.current,
        { scale: 0.4, rotate: selected ? -45 : 45 },
        { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(3)", overwrite: true },
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
