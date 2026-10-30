"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { idleState } from "@/lib/actions/form-state";
import { resendConfirmation } from "@/lib/actions/registration";
import { SubmitButton } from "./submit-button";

function Step({ done, children }: { done: boolean; children: React.ReactNode }) {
  const Icon = done ? CheckCircleIcon : CircleIcon;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Icon size={20} weight={done ? "fill" : "regular"} aria-hidden="true" className={done ? "text-success" : "text-ink-muted"} />
      {children}
    </li>
  );
}

/** What's left before a new studio's site goes public. */
export function SetupBanner({ email, emailConfirmed, subscribed }: { email: string; emailConfirmed: boolean; subscribed: boolean }) {
  const [state, formAction] = useActionState(resendConfirmation, idleState);

  return (
    <section aria-label="Publicar o site" className="mb-6 rounded-2xl bg-peach-50 p-4">
      <p className="font-bold">O seu site ainda não está público</p>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        <Step done={emailConfirmed}>
          <span>{emailConfirmed ? "Email confirmado" : `Confirme o email enviado para ${email}`}</span>
          {!emailConfirmed && (
            <form action={formAction}>
              <SubmitButton size="sm" variant="secondary" pendingLabel="A enviar…">
                Reenviar
              </SubmitButton>
            </form>
          )}
        </Step>
        <Step done={subscribed}>
          {subscribed ? (
            <span>Subscrição ativa</span>
          ) : (
            <Link href="/admin/subscricao" className="font-semibold text-accent underline">
              Ative a subscrição
            </Link>
          )}
        </Step>
      </ul>
      {state.message && (
        <p role="status" className="mt-3 text-sm font-semibold">
          {state.message}
        </p>
      )}
    </section>
  );
}
