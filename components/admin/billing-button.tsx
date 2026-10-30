"use client";

import { useActionState } from "react";
import { openBilling } from "@/lib/actions/billing";
import { idleState } from "@/lib/actions/form-state";
import { SubmitButton } from "./submit-button";

export function BillingButton({ label }: { label: string }) {
  const [state, formAction] = useActionState(openBilling, idleState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <SubmitButton pendingLabel="A abrir…">{label}</SubmitButton>
      {state.status === "error" && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
