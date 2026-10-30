"use client";

import { useId, useRef, useTransition } from "react";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { reactivateStudio, suspendStudio } from "@/lib/actions/platform";
import type { StudioRow } from "@/lib/data/platform";

/** Suspending takes a client's site offline, so it asks first. Reactivating doesn't. */
export function StudioAction({ studio }: { studio: StudioRow }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  if (studio.status === "suspended") {
    if (studio.suspendedFor !== "manual") return null; // Stripe brings it back
    return (
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(() => reactivateStudio(studio.id))}>
        {pending && <CircleNotchIcon size={16} className="animate-spin" aria-hidden="true" />}
        Reativar
      </Button>
    );
  }
  if (studio.status !== "active") return null;

  return (
    <>
      <Button size="sm" variant="danger" onClick={() => dialogRef.current?.showModal()}>
        Suspender
      </Button>
      <dialog ref={dialogRef} aria-labelledby={titleId} className="m-auto w-[min(92vw,420px)] rounded-3xl bg-surface p-6 text-ink shadow-lift backdrop:bg-ink/50">
        <h2 id={titleId} className="font-display text-2xl font-bold">
          Suspender {studio.name}?
        </h2>
        <p className="mt-2 text-ink-muted">O site sai do ar e as clientes deixam de poder marcar, até o reativares aqui.</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => dialogRef.current?.close()} disabled={pending} autoFocus>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await suspendStudio(studio.id);
                dialogRef.current?.close();
              })
            }
          >
            {pending && <CircleNotchIcon size={18} className="animate-spin" aria-hidden="true" />}
            Suspender
          </Button>
        </div>
      </dialog>
    </>
  );
}
