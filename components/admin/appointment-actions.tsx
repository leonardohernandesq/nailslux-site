"use client";

import { useId, useRef, useState, useTransition } from "react";
import type { ComponentProps } from "react";
import { CheckCircleIcon, CircleNotchIcon, ProhibitIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { ChangeReason } from "@/components/admin/change-reason";
import { RescheduleAppointment } from "@/components/admin/reschedule-appointment";
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
    title: "Tem a certeza que deseja cancelar este pedido?",
    body: "O horário continua livre no site.",
    yes: "Sim, cancelar",
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

/** Same width, same row: they share a three-column grid and shrink together on phones. */
const ROW_BUTTON = "w-full min-w-0 px-2 text-sm sm:px-4 sm:text-base";

/**
 * Confirmar · Remarcar · Cancelar, side by side. Confirming and cancelling (or
 * declining a request) ask first; on "yes" the decision is saved and WhatsApp
 * opens with the message for the client (when there's a number). A button that
 * doesn't apply to the current status stays in place, disabled.
 */
export function AppointmentActions({
  id,
  status,
  hasConflict,
  messages,
  reschedule,
}: {
  id: string;
  status: AppointmentStatus;
  hasConflict: boolean;
  /** wa.me links with the message for each decision; null without a phone number. */
  messages: Record<Intent, string> | null;
  /** What "Remarcar" needs; null (no studio settings) leaves the button disabled. */
  reschedule: Omit<ComponentProps<typeof RescheduleAppointment>, "id" | "onDone" | "className"> | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const [intent, setIntent] = useState<Intent>("confirm");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<FormState>(idleState);
  const [pending, startTransition] = useTransition();
  const error = state.status === "error";
  const question = QUESTIONS[intent];
  const canConfirm = status === "pending" || status === "declined";
  // A pending request is declined; a confirmed appointment is cancelled.
  const cancelIntent: Intent | null = status === "pending" ? "decline" : status === "confirmed" ? "cancel" : null;

  function ask(next: Intent) {
    setIntent(next);
    setReason("");
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
      if (intent !== "confirm") formData.set("reason", reason);
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

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Button
          className={ROW_BUTTON}
          aria-label={status === "declined" ? "Confirmar mesmo assim" : "Confirmar marcação"}
          disabled={!canConfirm || hasConflict}
          onClick={() => ask("confirm")}
        >
          <CheckCircleIcon size={20} weight="fill" aria-hidden="true" className="max-[380px]:hidden" />
          Confirmar
        </Button>
        {reschedule ? (
          <RescheduleAppointment
            {...reschedule}
            id={id}
            className={ROW_BUTTON}
            onDone={(message) => setState({ status: "success", message })}
          />
        ) : (
          <Button variant="secondary" className={ROW_BUTTON} disabled>
            Remarcar
          </Button>
        )}
        <Button
          variant="danger"
          className={ROW_BUTTON}
          aria-label={status === "pending" ? "Cancelar pedido" : "Cancelar marcação"}
          disabled={!cancelIntent}
          onClick={() => cancelIntent && ask(cancelIntent)}
        >
          <ProhibitIcon size={20} aria-hidden="true" className="max-[380px]:hidden" />
          Cancelar
        </Button>
      </div>

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
        {intent !== "confirm" && <ChangeReason id={reasonId} value={reason} onChange={setReason} disabled={pending} />}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => dialogRef.current?.close()}
            disabled={pending}
            autoFocus={intent === "confirm"}
          >
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
