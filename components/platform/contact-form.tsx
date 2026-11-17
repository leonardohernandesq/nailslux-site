"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Field, FieldError, Input, Textarea, describedBy } from "@/components/ui/field";
import { sendContactMessage } from "@/lib/actions/contact";
import { idleState } from "@/lib/actions/form-state";
import { CONTACT_KINDS } from "@/lib/validation/contact";
import { FormMessage } from "./auth-shell";

export function ContactForm() {
  const [state, formAction] = useActionState(sendContactMessage, idleState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  if (state.status === "success") return <FormMessage tone="success">{state.message}</FormMessage>;

  return (
    // The key resets the uncontrolled fields to what was sent, after an error.
    <form key={JSON.stringify(values)} action={formAction} noValidate className="flex flex-col gap-5">
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}

      <fieldset aria-describedby={errors.kind ? "kind-error" : undefined}>
        <legend className="text-sm font-semibold text-ink">
          Tipo de mensagem
          <span className="text-accent" aria-hidden="true">
            {" "}
            *
          </span>
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CONTACT_KINDS.map((kind) => (
            <label
              key={kind.value}
              className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-line-strong bg-surface px-3 text-sm font-semibold has-checked:border-accent has-checked:bg-peach-50 has-focus-visible:ring-4 has-focus-visible:ring-accent/15"
            >
              <input
                type="radio"
                name="kind"
                value={kind.value}
                defaultChecked={(values.kind ?? "sugestao") === kind.value}
                className="size-4 accent-(--color-accent)"
              />
              {kind.label}
            </label>
          ))}
        </div>
        <FieldError id="kind-error" errors={errors.kind} />
      </fieldset>

      <Field id="name" label="O seu nome" required errors={errors.name}>
        <Input id="name" name="name" required autoComplete="name" defaultValue={values.name} {...describedBy("name", errors.name)} />
      </Field>
      <Field id="email" label="Email" required errors={errors.email} hint="Respondemos para este email.">
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={values.email}
          {...describedBy("email", errors.email, "hint")}
        />
      </Field>
      <Field id="site" label="Nome ou endereço do seu studio" errors={errors.site} hint="Ex.: unhas-da-ines">
        <Input id="site" name="site" defaultValue={values.site} {...describedBy("site", errors.site, "hint")} />
      </Field>
      <Field id="message" label="Mensagem" required errors={errors.message}>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={3000}
          defaultValue={values.message}
          placeholder="Conte-nos o que gostaria de ver no seu site, o que correu mal ou o que gostou."
          {...describedBy("message", errors.message)}
        />
      </Field>

      {/* Hidden from people; see sendContactMessage. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <SubmitButton size="lg" pendingLabel="A enviar…" className="w-full">
        Enviar mensagem
      </SubmitButton>
    </form>
  );
}
