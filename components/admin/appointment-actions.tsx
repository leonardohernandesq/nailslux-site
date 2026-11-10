"use client";

import { useId, useRef, useState, useTransition } from "react";
import {
  CheckCircleIcon,
  CircleNotchIcon,
  ProhibitIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { decideAppointment } from "@/lib/actions/appointments";
import { idleState, type FormState } from "@/lib/actions/form-state";
import type { AppointmentStatus } from "@/lib/db/models";

type Intent = "confirm" | "decline" | "cancel";

const QUESTIONS: Record<Intent, { title: string; body: string; yes: string }> = {
  confirm: {
    title: "Tem a certeza que deseja confirmar esta marcação?",
    body: "O horário fica bloqueado no site.",
    yes: "Sim, confirmar",
  },
  decline: {
    title: "Tem a certeza que deseja recusar este pedido?",
    body: "O horário continua livre no site.",
    yes: "Sim, recusar",
  },
  cancel: {
    title: "Tem a certeza que deseja cancelar esta marcação?",
    body: "O horário volta a ficar livre no site.",
    yes: "Sim, cancelar",
  },
};

const WHATSAPP_NOTE: Record<Intent, string> = {
  confirm: "A seguir abre-se o WhatsApp com a confirmação, a data e a hora, pronta a enviar à cliente.",
  decline: "A seguir abre-se o WhatsApp com uma mensagem a avisar a cliente e a propor outra data.",
  cancel: "A seguir abre-se o WhatsApp com uma mensagem a avisar a cliente e a propor outra data.",
};

/**
 * Confirm / decline a request, or cancel a confirmed appointment. Each asks
 * first; on "yes" the decision is saved and WhatsApp opens with the message
 * for the client (when there's a number).
 */
export function AppointmentActions({
  id,
  status,
  hasConflict,
  messages,
}: {
  id: string;
  status: AppointmentStatus;
  hasConflict: boolean;
  /** wa.me links with the message for each decision; null without a phone number. */
  messages: Record<Intent, string> | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [intent, setIntent] = useState<Intent>("confirm");
  const [state, setState] = useState<FormState>(idleState);
  const [pending, startTransition] = useTransition();
  const error = state.status === "error";
  const question = QUESTIONS[intent];

  function ask(next: Intent) {
    setIntent(next);
    dialogRef.current?.showModal();
  }

  function decide() {
    const url = messages?.[intent];
    // Opened now, while the click still counts: browsers block pop-ups opened
    // after waiting on the server. It gets the WhatsApp link once saved.
    const whatsapp = url ? window.open("", "_blank") : null;
    if (whatsapp) whatsapp.opener = null;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("intent", intent);
      const result = await decideAppointment(id, idleState, formData);
      setState(result);
      dialogRef.current?.close();
      if (!whatsapp) return;
      if (result.status === "success" && url) whatsapp.location.href = url;
      else whatsapp.close();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {state.message && (
        <p
          role={error ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-2xl border p-4 text-sm font-semibold ${
            error ? "border-danger/25 bg-danger-soft text-danger" : "border-success/25 bg-success-soft text-success"
          }`}
        >
          {error ? (
            <WarningCircleIcon size={20} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
          ) : (
            <CheckCircleIcon size={20} weight="fill" aria-hidden="true" className="mt-px shrink-0" />
          )}
          {state.message}
        </p>
      )}

      {(status === "pending" || status === "declined") && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="w-full sm:flex-1" disabled={hasConflict} onClick={() => ask("confirm")}>
            <CheckCircleIcon size={22} weight="fill" aria-hidden="true" />
            {status === "declined" ? "Confirmar mesmo assim" : "Confirmar marcação"}
          </Button>
          {status === "pending" && (
            <Button size="lg" variant="secondary" className="w-full sm:flex-1" onClick={() => ask("decline")}>
              <XCircleIcon size={22} aria-hidden="true" />
              Recusar pedido
            </Button>
          )}
        </div>
      )}

      {status === "confirmed" && (
        <Button variant="danger" size="lg" onClick={() => ask("cancel")} className="sm:self-start">
          <ProhibitIcon size={22} aria-hidden="true" />
          Cancelar marcação
        </Button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(92vw,440px)] rounded-3xl bg-surface p-6 text-ink shadow-lift backdrop:bg-ink/50"
      >
        <h2 id={titleId} className="font-display text-2xl font-semibold">
          {question.title}
        </h2>
        <p className="mt-2 text-ink-muted">
          {question.body} {messages && WHATSAPP_NOTE[intent]}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => dialogRef.current?.close()} disabled={pending} autoFocus>
            Não
          </Button>
          <Button
            variant={intent === "confirm" ? "primary" : "danger"}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={decide}
          >
            {pending && <CircleNotchIcon size={18} className="animate-spin" aria-hidden="true" />}
            {question.yes}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
