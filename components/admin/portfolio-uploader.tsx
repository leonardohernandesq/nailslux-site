"use client";

import { useId, useRef, useState, useTransition } from "react";
import {
  CheckCircleIcon,
  CircleNotchIcon,
  UploadSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { uploadPortfolioPhoto } from "@/lib/actions/portfolio";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { imageFileSchema } from "@/lib/validation/portfolio";

type Item = {
  key: string;
  name: string;
  status: "waiting" | "uploading" | "done" | "error";
  message?: string;
};

export function PortfolioUploader() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  const update = (key: string, patch: Partial<Item>) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  function upload(files: File[]) {
    if (files.length === 0) return;
    const batch = files.map((file, i) => ({ file, key: `${Date.now()}-${i}-${file.name}` }));
    setItems(batch.map(({ file, key }) => ({ key, name: file.name, status: "waiting" })));

    startTransition(async () => {
      // One request per photo keeps each upload under the server's size limit.
      for (const { file, key } of batch) {
        const check = imageFileSchema.safeParse(file);
        if (!check.success) {
          update(key, { status: "error", message: check.error.issues[0]?.message });
          continue;
        }
        update(key, { status: "uploading" });
        try {
          const formData = new FormData();
          formData.set("file", file);
          const result = await uploadPortfolioPhoto(formData);
          update(key, {
            status: result.status === "success" ? "done" : "error",
            message: result.status === "success" ? undefined : result.message,
          });
        } catch {
          update(key, { status: "error", message: "Falha no envio. Verifique a ligação e tente de novo." });
        }
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  const done = items.filter((item) => item.status === "done").length;

  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!pending) upload(Array.from(e.dataTransfer.files));
        }}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors has-focus-visible:ring-4 has-focus-visible:ring-accent/20 ${
          dragging ? "border-accent bg-peach-50" : "border-line-strong bg-surface hover:bg-peach-50"
        } ${pending ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-peach-100 text-accent">
          <UploadSimpleIcon size={28} aria-hidden="true" />
        </span>
        <span className="font-display text-2xl font-semibold">Adicionar fotografias</span>
        <span className="text-sm text-ink-muted">
          Toque para escolher ou arraste para aqui. JPG, PNG, WebP ou AVIF, até{" "}
          {MAX_UPLOAD_BYTES / (1024 * 1024)} MB cada.
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          disabled={pending}
          onChange={(e) => upload(Array.from(e.target.files ?? []))}
          className="sr-only"
        />
      </label>

      {items.length > 0 && (
        <div className="rounded-2xl bg-surface p-4 shadow-soft">
          <p className="mb-2 text-sm font-semibold" aria-live="polite">
            {pending ? `A enviar… ${done} de ${items.length}` : `${done} de ${items.length} enviadas`}
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {items.map((item) => (
              <li key={item.key} className="flex items-start gap-2">
                {item.status === "done" && (
                  <CheckCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                )}
                {item.status === "error" && (
                  <WarningCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                )}
                {(item.status === "uploading" || item.status === "waiting") && (
                  <CircleNotchIcon
                    size={18}
                    className={`mt-0.5 shrink-0 text-ink-muted ${item.status === "uploading" ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {item.name}
                  <span className="sr-only">
                    {" "}
                    —{" "}
                    {{ waiting: "em espera", uploading: "a enviar", done: "enviada", error: "erro" }[item.status]}
                  </span>
                  {item.message && <span className="block font-semibold text-danger">{item.message}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
