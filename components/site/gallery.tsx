"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";
import type { PortfolioItemDTO } from "@/lib/data/portfolio";

const FALLBACK_ALT = "Trabalho de unhas feito no studio NailsLux";

export function Gallery({ items }: { items: PortfolioItemDTO[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const current = index === null ? null : items[index];

  function open(i: number) {
    setIndex(i);
    dialogRef.current?.showModal();
  }

  function step(delta: number) {
    setIndex((i) => (i === null ? i : (i + delta + items.length) % items.length));
  }

  return (
    <>
      {/* Every thumbnail is the same 4:5 portrait crop; the lightbox shows the full photo. */}
      <ul data-reveal-group className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => open(i)}
              className="group relative block aspect-4/5 w-full overflow-hidden rounded-2xl bg-peach-100 shadow-soft"
              aria-label={`Ampliar fotografia: ${item.caption ?? FALLBACK_ALT}`}
            >
              <Image
                src={item.src}
                alt=""
                fill
                placeholder="blur"
                blurDataURL={item.blurDataUrl}
                sizes="(min-width: 1152px) 270px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover transition-transform duration-500 ease-(--ease-out-soft) group-hover:scale-[1.03]"
              />
            </button>
            {item.caption && <p className="mt-2 px-1 text-sm text-ink-muted">{item.caption}</p>}
          </li>
        ))}
      </ul>

      {/* `index` is kept after closing, so the photo stays in place while the dialog fades out.
          Arrow keys swap photos instantly: keyboard navigation shouldn't wait on motion. */}
      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        aria-label="Fotografia ampliada"
        className="dialog-motion m-auto max-h-[92dvh] w-[min(92vw,960px)] overflow-visible bg-transparent p-0 backdrop:bg-ink/80"
      >
        {current && (
          <figure className="relative">
            <Image
              src={current.src}
              alt={current.caption ?? FALLBACK_ALT}
              width={current.width}
              height={current.height}
              placeholder="blur"
              blurDataURL={current.blurDataUrl}
              sizes="92vw"
              className="mx-auto max-h-[80dvh] w-auto rounded-2xl object-contain"
            />
            <figcaption className="mt-3 flex items-center justify-between gap-3 text-cream">
              <span className="text-sm">
                {current.caption ?? ""}
                <span className="sr-only">
                  {" "}
                  Fotografia {index! + 1} de {items.length}
                </span>
              </span>
              <span className="text-sm tabular-nums" aria-hidden="true">
                {index! + 1} / {items.length}
              </span>
            </figcaption>
            <div className="absolute -top-14 right-0 flex gap-2">
              {items.length > 1 && (
                <>
                  <LightboxButton label="Fotografia anterior" onClick={() => step(-1)}>
                    <CaretLeftIcon size={22} weight="bold" aria-hidden="true" />
                  </LightboxButton>
                  <LightboxButton label="Fotografia seguinte" onClick={() => step(1)}>
                    <CaretRightIcon size={22} weight="bold" aria-hidden="true" />
                  </LightboxButton>
                </>
              )}
              <LightboxButton label="Fechar" onClick={() => dialogRef.current?.close()}>
                <XIcon size={22} weight="bold" aria-hidden="true" />
              </LightboxButton>
            </div>
          </figure>
        )}
      </dialog>
    </>
  );
}

function LightboxButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-12 items-center justify-center rounded-full bg-cream text-ink shadow-soft hover:bg-peach-100"
    >
      {children}
    </button>
  );
}
