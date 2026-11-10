"use client";

import { useActionState, useState } from "react";
import { CheckCircleIcon, ProhibitIcon, WarningCircleIcon, WhatsappLogoIcon, XCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { decideAppointment } from "@/lib/actions/appointments";
import { idleState } from "@/lib/actions/form-state";
import type { AppointmentStatus } from "@/lib/db/models";
import { SubmitButton } from "./submit-button";

/** Confirm / decline a request, or cancel a confirmed appointment. */
export function AppointmentActions({
  id,
  status,
  hasConflict,
  notice,
}: {
  id: string;
  status: AppointmentStatus;
  hasConflict: boolean;
  /** WhatsApp message telling the client about the decision, once there is one. */
  notice: { url: string; label: string } | null;
}) {
  const [state, formAction] = useActionState(decideAppointment.bind(null, id), idleState);
  const [askCancel, setAskCancel] = useState(false);
  const error = state.status === "error";

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

      {state.status === "success" && notice && (
        <a
          href={notice.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover sm:self-start"
        >
          <WhatsappLogoIcon size={22} weight="fill" aria-hidden="true" />
          {notice.label} à cliente
        </a>
      )}

      {(status === "pending" || status === "declined") && (
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
          <SubmitButton
            name="intent"
            value="confirm"
            size="lg"
            className="w-full sm:flex-1"
            disabled={hasConflict}
          >
            <CheckCircleIcon size={22} weight="fill" aria-hidden="true" />
            {status === "declined" ? "Confirmar mesmo assim" : "Confirmar marcação"}
          </SubmitButton>
          {status === "pending" && (
            <SubmitButton name="intent" value="decline" size="lg" variant="secondary" className="w-full sm:flex-1">
              <XCircleIcon size={22} aria-hidden="true" />
              Recusar pedido
            </SubmitButton>
          )}
        </form>
      )}

      {status === "confirmed" &&
        (askCancel ? (
          <div className="rounded-2xl border border-danger/25 bg-danger-soft p-4">
            <p className="font-semibold text-danger">Cancelar esta marcação?</p>
            <p className="mt-1 text-sm text-ink-muted">
              O horário volta a ficar livre no site. A seguir pode avisar a cliente pelo WhatsApp e propor outra data.
            </p>
            <form action={formAction} className="mt-4 flex flex-col-reverse gap-3 sm:flex-row">
              <Button variant="ghost" onClick={() => setAskCancel(false)} autoFocus>
                Manter marcação
              </Button>
              <SubmitButton name="intent" value="cancel" variant="danger">
                <ProhibitIcon size={20} aria-hidden="true" />
                Sim, cancelar
              </SubmitButton>
            </form>
          </div>
        ) : (
          <Button variant="danger" size="lg" onClick={() => setAskCancel(true)} className="sm:self-start">
            <ProhibitIcon size={22} aria-hidden="true" />
            Cancelar marcação
          </Button>
        ))}
    </div>
  );
}
