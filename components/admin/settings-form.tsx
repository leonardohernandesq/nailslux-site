"use client";

import { useActionState } from "react";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Field, Input, describedBy } from "@/components/ui/field";
import { updateSettings } from "@/lib/actions/settings";
import { idleState } from "@/lib/actions/form-state";
import type { TenantDTO } from "@/lib/data/tenants";
import { formatPhone } from "@/lib/phone";
import { SubmitButton } from "./submit-button";

// Monday first, as in a Portuguese week.
const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

/** `studioId` is set when the platform admin edits a studio from the backoffice. */
export function SettingsForm({ tenant, studioId }: { tenant: TenantDTO; studioId?: string }) {
  const [state, formAction] = useActionState(updateSettings, idleState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6 rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
      {studioId && <input type="hidden" name="studioId" value={studioId} />}
      {state.status === "error" && state.message && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl border border-danger/25 bg-danger-soft p-4 text-sm font-semibold text-danger">
          <WarningCircleIcon size={20} weight="bold" aria-hidden="true" />
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p role="status" className="flex items-center gap-2 rounded-2xl border border-success/25 bg-success-soft p-4 text-sm font-semibold text-success">
          <CheckCircleIcon size={20} weight="fill" aria-hidden="true" />
          {state.message}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label="Nome do studio" required errors={errors.name}>
          <Input id="name" name="name" required maxLength={80} defaultValue={v?.name ?? tenant.name} {...describedBy("name", errors.name)} />
        </Field>
        <Field id="tagline" label="Frase curta" required errors={errors.tagline} hint="Ex.: Studio de unhas em Lisboa">
          <Input id="tagline" name="tagline" required maxLength={80} defaultValue={v?.tagline ?? tenant.tagline} {...describedBy("tagline", errors.tagline, "hint")} />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="whatsappNumber" label="WhatsApp" required errors={errors.whatsappNumber}>
          <Input
            id="whatsappNumber"
            name="whatsappNumber"
            type="tel"
            required
            defaultValue={v?.whatsappNumber ?? formatPhone(tenant.whatsappNumber)}
            {...describedBy("whatsappNumber", errors.whatsappNumber)}
          />
        </Field>
        <Field id="instagramUrl" label="Instagram" errors={errors.instagramUrl}>
          <Input
            id="instagramUrl"
            name="instagramUrl"
            type="url"
            placeholder="https://www.instagram.com/o.seu.studio/"
            defaultValue={v?.instagramUrl ?? tenant.instagramUrl ?? ""}
            {...describedBy("instagramUrl", errors.instagramUrl)}
          />
        </Field>
      </div>

      <Field id="address" label="Morada" errors={errors.address}>
        <Input id="address" name="address" maxLength={200} defaultValue={v?.address ?? tenant.address ?? ""} {...describedBy("address", errors.address)} />
      </Field>

      <fieldset>
        <legend className="text-sm font-semibold">Dias de abertura</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map(({ value, label }) => (
            <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 has-checked:border-accent has-checked:bg-peach-50">
              <input type="checkbox" name="days" value={value} defaultChecked={tenant.hours.days.includes(value as never)} className="size-4 accent-accent" />
              <span className="text-sm font-semibold">{label}</span>
            </label>
          ))}
        </div>
        {errors.days && <p className="mt-1.5 text-sm font-semibold text-danger">{errors.days[0]}</p>}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="opens" label="Primeira marcação" required errors={errors.opens}>
          <Input id="opens" name="opens" type="time" step={1800} required defaultValue={v?.opens ?? tenant.hours.opens} {...describedBy("opens", errors.opens)} />
        </Field>
        <Field id="lastStart" label="Última marcação" required errors={errors.lastStart}>
          <Input id="lastStart" name="lastStart" type="time" step={1800} required defaultValue={v?.lastStart ?? tenant.hours.lastStart} {...describedBy("lastStart", errors.lastStart)} />
        </Field>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="A guardar…">Guardar definições</SubmitButton>
      </div>
    </form>
  );
}
