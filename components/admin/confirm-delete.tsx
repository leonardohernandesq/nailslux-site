"use client";

import { useId, useRef, useTransition } from "react";
import { CircleNotchIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/** Delete button that asks for confirmation in a modal before running `action`. */
export function ConfirmDelete({
  action,
  itemLabel,
  description,
}: {
  action: () => Promise<void>;
  itemLabel: string;
  description: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`Apagar ${itemLabel}`}
        title="Apagar"
        className="flex size-11 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger-soft"
      >
        <TrashIcon size={20} aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(92vw,420px)] rounded-3xl bg-surface p-6 text-ink shadow-lift backdrop:bg-ink/50"
      >
        <h2 id={titleId} className="font-display text-2xl font-semibold">
          Apagar {itemLabel}?
        </h2>
        <p className="mt-2 text-ink-muted">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => dialogRef.current?.close()} disabled={pending} autoFocus>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await action();
                dialogRef.current?.close();
              })
            }
          >
            {pending ? (
              <CircleNotchIcon size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <TrashIcon size={18} aria-hidden="true" />
            )}
            Apagar
          </Button>
        </div>
      </dialog>
    </>
  );
}
