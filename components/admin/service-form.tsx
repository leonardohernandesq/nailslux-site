"use client";

import Link from "next/link";
import { useActionState } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input, Textarea, describedBy } from "@/components/ui/field";
import { idleState, type FormState } from "@/lib/actions/form-state";
import type { ServiceDTO } from "@/lib/data/services";
import { SubmitButton } from "./submit-button";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function ServiceForm({ action, service }: { action: Action; service?: ServiceDTO }) {
  const [state, formAction] = useActionState(action, idleState);
  const errors = state.fieldErrors ?? {};
  // After a failed submit, show what was typed; otherwise the saved values.
  const v = state.values;
  const defaults = {
    name: v?.name ?? service?.name ?? "",
    description: v?.description ?? service?.description ?? "",
    price: v?.price ?? (service ? centsToInput(service.priceCents) : ""),
    durationMinutes: v?.durationMinutes ?? (service?.durationMinutes?.toString() ?? ""),
    active: v ? v.active === "on" : (service?.active ?? true),
  };

  return (
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-6 rounded-3xl bg-surface p-5 shadow-soft sm:p-8"
    >
      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-danger/25 bg-danger-soft p-4 text-sm font-semibold text-danger"
        >
          <WarningCircleIcon size={20} weight="bold" aria-hidden="true" />
          {state.message}
        </p>
      )}

      <Field id="name" label="Nome do serviço" required errors={errors.name}>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={defaults.name}
          placeholder="Ex.: Verniz gel nas mãos"
          {...describedBy("name", errors.name)}
        />
      </Field>

      <Field
        id="description"
        label="Descrição"
        errors={errors.description}
        hint="Uma frase curta que aparece no site."
      >
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={300}
          defaultValue={defaults.description}
          {...describedBy("description", errors.description, "hint")}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="price" label="Preço (€)" required errors={errors.price} hint="Ex.: 25 ou 25,50">
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-semibold text-ink-muted"
            >
              €
            </span>
            <Input
              id="price"
              name="price"
              inputMode="decimal"
              required
              defaultValue={defaults.price}
              className="pl-9 tabular-nums"
              {...describedBy("price", errors.price, "hint")}
            />
          </div>
        </Field>

        <Field
          id="durationMinutes"
          label="Duração (minutos)"
          errors={errors.durationMinutes}
          hint="Ajuda a cliente a planear o tempo."
        >
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            inputMode="numeric"
            min={5}
            max={480}
            step={5}
            defaultValue={defaults.durationMinutes}
            {...describedBy("durationMinutes", errors.durationMinutes, "hint")}
          />
        </Field>
      </div>

      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-3">
        <input
          type="checkbox"
          name="active"
          defaultChecked={defaults.active}
          className="size-5 accent-accent"
        />
        <span>
          <span className="block font-semibold">Visível no site</span>
          <span className="block text-sm text-ink-muted">
            Desmarque para esconder o serviço sem o apagar.
          </span>
        </span>
      </label>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/admin/servicos" className={buttonClasses({ variant: "ghost" })}>
          Cancelar
        </Link>
        <SubmitButton pendingLabel="A guardar…">Guardar serviço</SubmitButton>
      </div>
    </form>
  );
}
