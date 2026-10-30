"use client";

import { useActionState } from "react";
import { PlanPicker } from "@/components/platform/plan-picker";
import { openBilling } from "@/lib/actions/billing";
import { idleState } from "@/lib/actions/form-state";
import { SubmitButton } from "./submit-button";

export function BillingButton({ label, choosePlan = false }: { label: string; choosePlan?: boolean }) {
  const [state, formAction] = useActionState(openBilling, idleState);

  return (
    <form action={formAction} className="flex w-full flex-col items-start gap-4">
      {choosePlan && (
        <div className="w-full max-w-lg">
          <PlanPicker />
        </div>
      )}
      <SubmitButton pendingLabel="A abrir…">{label}</SubmitButton>
      {state.status === "error" && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
