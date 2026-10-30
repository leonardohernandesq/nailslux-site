"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Field, Input, describedBy } from "@/components/ui/field";
import { register } from "@/lib/actions/registration";
import { idleState } from "@/lib/actions/form-state";
import { slugify } from "@/lib/validation/registration";
import { FormMessage } from "./auth-shell";

export function RegisterForm({ siteHost }: { siteHost: string }) {
  const [state, formAction] = useActionState(register, idleState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const [studioName, setStudioName] = useState("");
  // The address follows the name until it's edited by hand.
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const slug = customSlug ?? v?.slug ?? slugify(studioName);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.status === "error" && state.message && !state.fieldErrors && <FormMessage tone="error">{state.message}</FormMessage>}

      <Field id="studioName" label="Nome do studio" required errors={errors.studioName}>
        <Input
          id="studioName"
          name="studioName"
          required
          maxLength={80}
          autoComplete="organization"
          defaultValue={v?.studioName}
          onChange={(event) => setStudioName(event.target.value)}
          {...describedBy("studioName", errors.studioName)}
        />
      </Field>

      <Field id="slug" label="Endereço do site" required errors={errors.slug} hint={`${siteHost}/${slug || "o-seu-studio"}`}>
        <Input
          id="slug"
          name="slug"
          required
          maxLength={40}
          value={slug}
          onChange={(event) => setCustomSlug(event.target.value.toLowerCase())}
          {...describedBy("slug", errors.slug, "hint")}
        />
      </Field>

      <Field id="whatsappNumber" label="WhatsApp do studio" required errors={errors.whatsappNumber} hint="Os pedidos de marcação chegam a este número.">
        <Input
          id="whatsappNumber"
          name="whatsappNumber"
          type="tel"
          required
          autoComplete="tel"
          placeholder="912 345 678"
          defaultValue={v?.whatsappNumber}
          {...describedBy("whatsappNumber", errors.whatsappNumber, "hint")}
        />
      </Field>

      <Field id="ownerName" label="O seu nome" required errors={errors.ownerName}>
        <Input id="ownerName" name="ownerName" required maxLength={80} autoComplete="name" defaultValue={v?.ownerName} {...describedBy("ownerName", errors.ownerName)} />
      </Field>

      <Field id="email" label="Email" required errors={errors.email}>
        <Input id="email" name="email" type="email" required autoComplete="username" defaultValue={v?.email} {...describedBy("email", errors.email)} />
      </Field>

      <Field id="password" label="Palavra-passe" required errors={errors.password} hint="Pelo menos 10 caracteres.">
        <Input id="password" name="password" type="password" required autoComplete="new-password" {...describedBy("password", errors.password, "hint")} />
      </Field>

      {/* Left empty by people; see the check in the register action. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" />

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="terms" aria-invalid={errors.terms ? true : undefined} className="mt-0.5 size-5 shrink-0 accent-accent" />
          <span>
            Aceito os{" "}
            <Link href="/termos" target="_blank" className="font-semibold text-accent underline">
              termos
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="font-semibold text-accent underline">
              política de privacidade
            </Link>
            .
          </span>
        </label>
        {errors.terms && <p className="mt-1.5 text-sm font-semibold text-danger">{errors.terms[0]}</p>}
      </div>

      <SubmitButton size="lg" pendingLabel="A criar…" className="mt-1 w-full">
        Criar o meu site
      </SubmitButton>
    </form>
  );
}
