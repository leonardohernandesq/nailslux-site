"use client";

import Image from "next/image";
import { useId, useRef } from "react";
import {
  ArrowDownIcon,
  CheckCircleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { buttonClasses } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { gsap, MOTION, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { useBooking } from "./booking-context";

/**
 * Asks "book now?" right after a service is picked from a card.
 * "Agendar Agora" scrolls to the booking form; "Continuar Selecionando" (or Esc,
 * or a click outside) closes it and keeps the visitor where they were.
 */
export function BookNowDialog({
  targetId = "marcar",
  headingId = "marcar-title",
}: {
  targetId?: string;
  headingId?: string;
}) {
  const { services, selectedIds, promptedId, dismissPrompt } = useBooking();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const closing = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  const service = services.find((s) => s.id === promptedId);
  const chosen = services.filter((s) => selectedIds.includes(s.id));
  const total = chosen.reduce((sum, s) => sum + s.priceCents, 0);

  // Open and animate in whenever a new service is picked.
  useGSAP(
    () => {
      const dialog = dialogRef.current;
      if (!promptedId || !dialog || dialog.open) return;
      closing.current = false;
      dialog.showModal();

      const reduced = prefersReducedMotion();
      timeline.current?.kill();
      const tl = gsap.timeline({ defaults: { ease: MOTION.easeOut } });
      tl.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: reduced ? 0.01 : 0.3 },
      );
      if (reduced) {
        tl.fromTo(
          panelRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.15 },
          0,
        );
      } else {
        tl.fromTo(
          panelRef.current,
          { opacity: 0, y: 48, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: MOTION.base,
            ease: "back.out(1.5)",
          },
          0.05,
        ).fromTo(
          panelRef.current!.querySelectorAll("[data-dialog-item]"),
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.06 },
          0.15,
        );
      }
      timeline.current = tl;
    },
    { dependencies: [promptedId], scope: dialogRef },
  );

  const { contextSafe } = useGSAP({ scope: dialogRef });

  // Exit runs faster than the entrance, and can interrupt it mid-way.
  function close(after?: () => void) {
    const dialog = dialogRef.current;
    if (!dialog?.open || closing.current) return;
    closing.current = true;
    timeline.current?.kill();

    const reduced = prefersReducedMotion();
    contextSafe(() => {
      timeline.current = gsap
        .timeline({
          defaults: {
            ease: MOTION.easeIn,
            duration: reduced ? 0.01 : MOTION.fast,
          },
          onComplete: () => {
            dialog.close();
            after?.();
          },
        })
        .to(
          panelRef.current,
          reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 },
        )
        .to(overlayRef.current, { opacity: 0 }, 0);
    })();
  }

  function bookNow() {
    close(() => {
      const heading = document.getElementById(headingId);
      if (heading) {
        // Move focus with the view, so keyboard and screen reader users land on the form too.
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      document.getElementById(targetId)?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      // Esc: run the exit animation instead of the instant native close.
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      // Any close (including a forced one by the browser) clears the prompt.
      onClose={() => {
        closing.current = false;
        dismissPrompt();
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      <div
        ref={overlayRef}
        aria-hidden="true"
        onClick={() => close()}
        className="absolute inset-0 bg-ink/55 backdrop-blur-[3px]"
      />
      <div className="pointer-events-none relative flex min-h-full items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
        <div
          ref={panelRef}
          className="pointer-events-auto w-full max-w-md rounded-4xl bg-surface p-6 text-center shadow-lift sm:p-8"
        >
          <div data-dialog-item className="relative mx-auto w-fit">
            <Image
              src="/brand/fox.png"
              alt=""
              width={279}
              height={339}
              className="h-16 w-auto"
            />
            <CheckCircleIcon
              size={28}
              weight="fill"
              aria-hidden="true"
              className="absolute -right-3 -bottom-1 rounded-full bg-surface text-success"
            />
          </div>

          <h2
            id={titleId}
            data-dialog-item
            className="font-display mt-4 text-3xl leading-tight font-semibold"
          >
            Deseja agendar o seu horário agora?
          </h2>

          <div
            id={descriptionId}
            data-dialog-item
            className="mt-3 text-ink-muted"
          >
            {service && (
              <p>
                <strong className="text-ink">{service.name}</strong> foi
                adicionado à sua escolha.
              </p>
            )}
            {chosen.length > 0 && (
              <p className="mt-3 inline-flex rounded-full bg-peach-50 px-4 py-1.5 text-sm font-bold text-accent">
                {chosen.length} {chosen.length === 1 ? "serviço" : "serviços"} ·{" "}
                <span className="ml-1 tabular-nums">{formatPrice(total)}</span>
              </p>
            )}
          </div>

          <div data-dialog-item className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              autoFocus
              onClick={bookNow}
              className={buttonClasses({ size: "lg" })}
            >
              <ArrowDownIcon size={20} weight="bold" aria-hidden="true" />
              Agendar Agora
            </button>
            <button
              type="button"
              onClick={() => close()}
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              <PlusIcon size={20} weight="bold" aria-hidden="true" />
              Continuar Selecionando
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
