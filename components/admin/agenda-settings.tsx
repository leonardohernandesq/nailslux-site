"use client";

import { useActionState, useState } from "react";
import { BellRingingIcon, CalendarDotsIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/actions/form-state";
import { resetCalendarLink, setBookingEmails } from "@/lib/actions/panel-settings";
import { SubmitButton } from "./submit-button";

function StatusLine({ state }: { state: { status: string; message?: string } }) {
  return (
    <p aria-live="polite" className={`text-sm font-semibold ${state.status === "error" ? "text-danger" : "text-success"}`}>
      {state.message}
    </p>
  );
}

/** The calendar feed link and the new-request emails. */
export function AgendaSettings({
  calendarUrl,
  notifyNewBookings,
  email,
  mailReady,
}: {
  calendarUrl: string | null;
  notifyNewBookings: boolean;
  email: string;
  mailReady: boolean;
}) {
  const [linkState, linkAction] = useActionState(resetCalendarLink, idleState);
  const [mailState, mailAction] = useActionState(setBookingEmails, idleState);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!calendarUrl) return;
    await navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section aria-labelledby="agenda-title" className="mt-6 flex flex-col gap-6 rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
      <h2 id="agenda-title" className="font-display text-2xl font-semibold">
        Agenda e avisos
      </h2>

      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 font-bold">
          <CalendarDotsIcon size={20} aria-hidden="true" />
          Marcações no calendário do telemóvel
        </h3>
        <p className="text-sm text-ink-muted">
          Subscreva este link no Google Calendar, no calendário do iPhone ou no Outlook. As marcações confirmadas
          aparecem sozinhas e atualizam-se ao longo do dia.
        </p>
        {calendarUrl ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={calendarUrl}
                aria-label="Link do calendário"
                onFocus={(event) => event.currentTarget.select()}
                className="min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-peach-50 px-4 font-mono text-sm"
              />
              <Button variant="secondary" onClick={copy}>
                {copied ? <CheckIcon size={18} aria-hidden="true" /> : <CopyIcon size={18} aria-hidden="true" />}
                {copied ? "Copiado" : "Copiar link"}
              </Button>
            </div>
            <details className="text-sm text-ink-muted">
              <summary className="min-h-11 py-2 font-semibold text-accent">Como adicionar ao calendário</summary>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Google Calendar</strong> (no computador): Outros calendários → + → A partir do URL → cole o link.
                </li>
                <li>
                  <strong>iPhone</strong>: Definições → Calendário → Contas → Adicionar conta → Outra → Adicionar calendário
                  subscrito → cole o link.
                </li>
                <li>
                  <strong>Outlook</strong>: Adicionar calendário → Subscrever a partir da Web → cole o link.
                </li>
              </ul>
            </details>
            <p className="text-sm text-ink-muted">
              Quem tiver este link vê as suas marcações. Se o partilhou por engano, troque-o: o antigo deixa de funcionar.
            </p>
          </>
        ) : null}
        <form action={linkAction} className="flex flex-wrap items-center gap-3">
          <SubmitButton variant={calendarUrl ? "ghost" : "primary"} pendingLabel="A criar…">
            {calendarUrl ? "Trocar link" : "Criar link do calendário"}
          </SubmitButton>
          <StatusLine state={linkState} />
        </form>
      </div>

      <form action={mailAction} className="flex flex-col gap-3 border-t border-line pt-6">
        <h3 className="flex items-center gap-2 font-bold">
          <BellRingingIcon size={20} aria-hidden="true" />
          Aviso de novos pedidos
        </h3>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" name="notifyNewBookings" defaultChecked={notifyNewBookings} className="size-5 accent-accent" />
          <span>
            Enviar um email para <strong className="wrap-anywhere">{email}</strong> sempre que chega um pedido
          </span>
        </label>
        {!mailReady && (
          <p className="rounded-2xl bg-peach-50 p-3 text-sm text-ink-muted">
            O envio de emails ainda não está ativo na plataforma. A sua escolha fica guardada para quando estiver.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton variant="secondary" pendingLabel="A guardar…">
            Guardar
          </SubmitButton>
          <StatusLine state={mailState} />
        </div>
      </form>
    </section>
  );
}
