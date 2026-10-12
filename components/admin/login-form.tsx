"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EyeIcon, EyeSlashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Field, Input, describedBy } from "@/components/ui/field";
import { login } from "@/lib/actions/auth";
import { idleState } from "@/lib/actions/form-state";
import { SubmitButton } from "./submit-button";

export function LoginForm() {
  const [state, formAction] = useActionState(login, idleState);
  const [showPassword, setShowPassword] = useState(false);
  const errors = state.fieldErrors ?? {};
  // Set by the proxy when a logged-out visit (e.g. a booking link) was sent here.
  const callbackUrl = useSearchParams().get("callbackUrl") ?? "";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {state.status === "error" && state.message && !state.fieldErrors && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-danger/25 bg-danger-soft p-4 text-sm font-semibold text-danger"
        >
          <WarningCircleIcon size={20} weight="bold" aria-hidden="true" />
          {state.message}
        </p>
      )}

      <Field id="email" label="Email" required errors={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.values?.email}
          {...describedBy("email", errors.email)}
        />
      </Field>

      <Field id="password" label="Palavra-passe" required errors={errors.password}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-14"
            {...describedBy("password", errors.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-peach-50 hover:text-ink"
          >
            {showPassword ? <EyeSlashIcon size={20} aria-hidden="true" /> : <EyeIcon size={20} aria-hidden="true" />}
          </button>
        </div>
      </Field>

      <SubmitButton size="lg" pendingLabel="A entrar…" className="mt-2 w-full">
        Entrar
      </SubmitButton>
    </form>
  );
}
