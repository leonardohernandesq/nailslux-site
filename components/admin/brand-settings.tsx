"use client";

import Image from "next/image";
import { useActionState, useRef, useState, useTransition } from "react";
import { removeBrandImage, resetBrandColors, updateBrandColors, uploadBrandImage } from "@/lib/actions/brand";
import { idleState, type FormState } from "@/lib/actions/form-state";
import { DEFAULT_COLORS } from "@/lib/brand-colors";
import { ACCEPTED_IMAGE_TYPES, BRAND_MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { TenantDTO } from "@/lib/data/tenants";
import { Button } from "@/components/ui/button";
import { BRAND_FILE_TOO_BIG } from "@/lib/validation/brand";
import { SubmitButton } from "./submit-button";

function ColorField({ name, label, hint, value }: { name: string; label: string; hint: string; value: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="color" name={name} defaultValue={value} className="size-12 shrink-0 cursor-pointer rounded-xl border border-line bg-surface p-1" />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}

function ColorsForm({ primary, secondary, studioId }: { primary: string | null; secondary: string | null; studioId?: string }) {
  const [state, formAction] = useActionState(updateBrandColors, idleState);

  return (
    <div>
      <h3 className="font-bold">Cores do site</h3>
      <form action={formAction} className="mt-3 flex flex-col gap-4">
        {studioId && <input type="hidden" name="studioId" value={studioId} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField name="primaryColor" label="Cor principal" hint="Botões e destaques" value={primary ?? DEFAULT_COLORS.primary} />
          <ColorField name="secondaryColor" label="Cor secundária" hint="Detalhes e gradientes" value={secondary ?? DEFAULT_COLORS.secondary} />
        </div>
        <p className="text-sm text-ink-muted">Em cores muito claras, os textos e botões usam um tom mais escuro para se lerem bem.</p>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton size="sm" pendingLabel="A guardar…">
            Guardar cores
          </SubmitButton>
          {primary && (
            <Button type="submit" size="sm" variant="secondary" formAction={resetBrandColors}>
              Repor cores
            </Button>
          )}
          {state.message && (
            <p role={state.status === "error" ? "alert" : "status"} className={`text-sm font-semibold ${state.status === "error" ? "text-danger" : "text-success"}`}>
              {state.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

type ImageFieldProps = {
  kind: "logo" | "banner";
  label: string;
  hint: string;
  image: { src: string; width: number; height: number } | null;
  studioId?: string;
};

function ImageField({ kind, label, hint, image, studioId }: ImageFieldProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState>(idleState);
  const input = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    // Over the limit the server never gets to answer, so it's caught here.
    if (file.size > BRAND_MAX_UPLOAD_BYTES) {
      setResult({ status: "error", message: BRAND_FILE_TOO_BIG });
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    if (studioId) formData.set("studioId", studioId);
    startTransition(async () => {
      setResult(await uploadBrandImage(kind, formData));
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div>
      <h3 className="font-bold">{label}</h3>
      <p className="text-sm text-ink-muted">{hint}</p>
      <div className="mt-3 flex min-h-28 items-center justify-center rounded-2xl bg-peach-50 p-3">
        {image ? (
          <Image src={image.src} alt={`${label} atual`} width={image.width} height={image.height} sizes="240px" className="max-h-24 w-auto rounded-lg object-contain" />
        ) : (
          <p className="text-sm text-ink-muted">Ainda sem imagem</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className={`inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-semibold ring-1 ring-line-strong has-focus-visible:ring-2 hover:bg-peach-50 ${pending ? "opacity-60" : ""}`}>
          {pending ? "A enviar…" : image ? "Trocar" : "Escolher imagem"}
          <input
            ref={input}
            type="file"
            aria-label={label}
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            disabled={pending}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </label>
        {image && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await removeBrandImage(kind, studioId);
                setResult(idleState);
              })
            }
          >
            Remover
          </Button>
        )}
      </div>
      {result.message && (
        <p role={result.status === "error" ? "alert" : "status"} className={`mt-2 text-sm font-semibold ${result.status === "error" ? "text-danger" : "text-success"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}

/**
 * Colors and images save on their own: one image per request keeps uploads within
 * the size limit. `studioId` is set when the platform admin edits from the backoffice.
 */
export function BrandSettings({ brand, studioId }: { brand: TenantDTO["brand"]; studioId?: string }) {
  return (
    <section aria-labelledby="brand-title" className="mb-6 flex flex-col gap-6 rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
      <h2 id="brand-title" className="font-display text-2xl font-bold">
        Aspeto do site
      </h2>
      <ColorsForm primary={brand.primaryColor} secondary={brand.secondaryColor} studioId={studioId} />
      <div className="grid gap-6 sm:grid-cols-2">
        <ImageField kind="logo" label="Logo" hint="Aparece no site e no separador do navegador. Prefira PNG com fundo transparente." image={brand.logo} studioId={studioId} />
        <ImageField kind="banner" label="Banner" hint="A fotografia em destaque no topo do site." image={brand.banner} studioId={studioId} />
      </div>
    </section>
  );
}
