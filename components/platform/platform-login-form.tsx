"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Field, Input, describedBy } from "@/components/ui/field";
import { idleState } from "@/lib/actions/form-state";
import { platformLogin } from "@/lib/actions/platform";
import { FormMessage } from "./auth-shell";

export function PlatformLoginForm() {
  const [state, formAction] = useActionState(platformLogin, idleState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.status === "error" && state.message && !state.fieldErrors && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field id="email" label="Email" required errors={errors.email}>
        <Input id="email" name="email" type="email" required autoComplete="username" defaultValue={state.values?.email} {...describedBy("email", errors.email)} />
      </Field>
      <Field id="password" label="Palavra-passe" required errors={errors.password}>
        <Input id="password" name="password" type="password" required autoComplete="current-password" {...describedBy("password", errors.password)} />
      </Field>
      <SubmitButton size="lg" pendingLabel="A entrar…" className="mt-1 w-full">
        Entrar
      </SubmitButton>
    </form>
  );
}
