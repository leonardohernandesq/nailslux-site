"use client";

import { useActionState } from "react";
import { CheckIcon } from "@phosphor-icons/react";
import { idleState, type FormState } from "@/lib/actions/form-state";
import { controlClasses } from "@/components/ui/field";
import { IconSubmitButton } from "./submit-button";

export function CaptionForm({
  action,
  caption,
  inputId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  caption?: string;
  inputId: string;
}) {
  const [state, formAction] = useActionState(action, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <label htmlFor={inputId} className="sr-only">
        Legenda
      </label>
      <div className="flex items-center gap-1">
        <input
          id={inputId}
          name="caption"
          defaultValue={caption}
          maxLength={120}
          placeholder="Legenda (opcional)"
          className={`${controlClasses} min-h-11 py-2 text-sm`}
        />
        <IconSubmitButton label="Guardar legenda">
          <CheckIcon size={20} weight="bold" aria-hidden="true" />
        </IconSubmitButton>
      </div>
      <p
        aria-live="polite"
        className={`min-h-5 text-xs font-semibold ${state.status === "error" ? "text-danger" : "text-success"}`}
      >
        {state.message}
      </p>
    </form>
  );
}
