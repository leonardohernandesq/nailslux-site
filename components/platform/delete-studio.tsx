"use client";

import { useActionState, useId, useRef, useState } from "react";
import { TrashIcon } from "@phosphor-icons/react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { deleteStudio } from "@/lib/actions/platform";
import { idleState } from "@/lib/actions/form-state";

/** Deleting can't be undone, so the dialog asks for the studio's address, typed by hand. */
export function DeleteStudio({ id, name, slug, billedByStripe }: { id: string; name: string; slug: string; billedByStripe: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(deleteStudio.bind(null, id), idleState);
  const [typed, setTyped] = useState("");
  const titleId = useId();
  const inputId = useId();

  return (
    <section aria-labelledby={`${titleId}-section`} className="mt-6 rounded-3xl border border-danger/25 bg-surface p-5 sm:p-8">
      <h2 id={`${titleId}-section`} className="font-display text-2xl font-semibold text-danger">
        Eliminar studio
      </h2>
      <p className="mt-1 text-ink-muted">
        Apaga o site, a conta, os serviços, as fotografias, as marcações, as fichas de clientes e as estatísticas. Não dá para desfazer.
      </p>
      <Button variant="danger" className="mt-4" onClick={() => dialog.current?.showModal()}>
        <TrashIcon size={18} aria-hidden="true" />
        Eliminar {name}
      </Button>

      <dialog ref={dialog} aria-labelledby={titleId} className="m-auto w-[min(92vw,460px)] rounded-3xl bg-surface p-6 text-ink shadow-lift backdrop:bg-ink/50">
        <form action={formAction} className="flex flex-col gap-4">
          <h2 id={titleId} className="font-display text-2xl font-bold">
            Eliminar {name}?
          </h2>
          <p className="text-ink-muted">
            Tudo o que é deste studio é apagado de vez.
            {billedByStripe && " A subscrição na Stripe é cancelada já, sem mais cobranças."}
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-semibold">
              Para confirmar, escreva <strong className="font-mono">{slug}</strong>
            </label>
            <Input id={inputId} name="confirm" autoComplete="off" value={typed} onChange={(event) => setTyped(event.target.value)} />
          </div>
          {state.status === "error" && (
            <p role="alert" className="rounded-2xl border border-danger/25 bg-danger-soft p-3 text-sm font-semibold text-danger">
              {state.message}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => dialog.current?.close()} autoFocus>
              Cancelar
            </Button>
            <SubmitButton variant="danger" pendingLabel="A eliminar…" disabled={typed.trim().toLowerCase() !== slug}>
              Eliminar de vez
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </section>
  );
}
