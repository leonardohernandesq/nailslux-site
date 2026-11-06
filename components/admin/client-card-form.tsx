"use client";

import { useActionState } from "react";
import { Field, Textarea, describedBy } from "@/components/ui/field";
import { saveClientCard } from "@/lib/actions/clients";
import { idleState } from "@/lib/actions/form-state";
import { FOOT, HAND } from "./client-molds-form";
import { MoldInput } from "./mold-input";
import { SubmitButton } from "./submit-button";

/** Molds and private notes on the client's card. */
export function ClientCardForm({
  clientId,
  handMold,
  footMold,
  notes,
}: {
  clientId: string;
  handMold?: string;
  footMold?: string;
  notes?: string;
}) {
  const [state, formAction] = useActionState(saveClientCard.bind(null, clientId), idleState);
  const values = state.values ?? { handMold, footMold, notes };
  const errors = state.fieldErrors ?? {};

  return (
    <form key={`${handMold}|${footMold}|${notes}`} action={formAction} className="flex flex-col gap-5">
      <Field
        id="notes"
        label="Notas"
        errors={errors.notes}
        hint="Só o studio vê. Ex.: alergias, preferências, a cor da última vez."
      >
        <Textarea id="notes" name="notes" maxLength={1000} rows={4} defaultValue={values.notes} {...describedBy("notes", errors.notes, "hint")} />
      </Field>
      <div className="grid max-w-2xl gap-x-8 gap-y-4 sm:grid-cols-2">
        <MoldInput name="handMold" label="Molde da mão" fingers={HAND} defaultValue={values.handMold} errors={errors.handMold} />
        <MoldInput name="footMold" label="Molde do pé" fingers={FOOT} defaultValue={values.footMold} errors={errors.footMold} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="A guardar…">Guardar ficha</SubmitButton>
        <p aria-live="polite" className={`text-sm font-semibold ${state.status === "error" ? "text-danger" : "text-success"}`}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
