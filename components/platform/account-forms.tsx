"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/submit-button";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input, describedBy } from "@/components/ui/field";
import { idleState } from "@/lib/actions/form-state";
import { confirmEmail, requestPasswordReset, resetPassword } from "@/lib/actions/registration";
import { FormMessage } from "./auth-shell";

/** A button rather than confirming on load: mail scanners open every link they see. */
export function ConfirmEmailForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(confirmEmail, idleState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="success">{state.message}</FormMessage>
        <Link href="/admin" className={buttonClasses()}>
          Ir para o painel
        </Link>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <input type="hidden" name="token" value={token} />
      <SubmitButton size="lg" pendingLabel="A confirmar…" className="w-full">
        Confirmar email
      </SubmitButton>
    </form>
  );
}

export function RequestResetForm() {
  const [state, formAction] = useActionState(requestPasswordReset, idleState);
  const errors = state.fieldErrors?.email;

  if (state.status === "success") return <FormMessage tone="success">{state.message}</FormMessage>;
  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <Field id="email" label="Email" required errors={errors}>
        <Input id="email" name="email" type="email" required autoComplete="username" {...describedBy("email", errors)} />
      </Field>
      <SubmitButton size="lg" pendingLabel="A enviar…" className="w-full">
        Enviar link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPassword, idleState);
  const errors = state.fieldErrors?.password;

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="success">{state.message}</FormMessage>
        <Link href="/admin/login" className={buttonClasses()}>
          Entrar
        </Link>
      </div>
    );
  }
  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.status === "error" && !state.fieldErrors && <FormMessage tone="error">{state.message}</FormMessage>}
      <input type="hidden" name="token" value={token} />
      <Field id="password" label="Nova palavra-passe" required errors={errors} hint="Pelo menos 10 caracteres.">
        <Input id="password" name="password" type="password" required autoComplete="new-password" {...describedBy("password", errors, "hint")} />
      </Field>
      <SubmitButton size="lg" pendingLabel="A guardar…" className="w-full">
        Guardar
      </SubmitButton>
    </form>
  );
}
