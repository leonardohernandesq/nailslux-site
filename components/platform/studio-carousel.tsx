"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowSquareOutIcon, CaretLeftIcon, CaretRightIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import type { ShowcaseStudio } from "@/lib/data/showcase";
import { shuffled } from "@/lib/shuffle";

const AUTOPLAY_MS = 5000;

// One order per visit. The server renders with seed 0 so hydration matches.
const visitSeed = Math.random() || 0.5;
const subscribeToNothing = () => () => {};

const CONTROL = "inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-soft transition-colors hover:bg-ink hover:text-cream";

export function StudioCarousel({ studios }: { studios: ShowcaseStudio[] }) {
  const seed = useSyncExternalStore(subscribeToNothing, () => visitSeed, () => 0);
  const ordered = useMemo(() => shuffled(studios, seed), [studios, seed]);
  const track = useRef<HTMLUListElement>(null);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false); // hovering or focusing inside

  const several = studios.length > 1;

  function move(direction: 1 | -1) {
    const list = track.current;
    if (!list) return;
    const step = (list.firstElementChild?.clientWidth ?? list.clientWidth) + 20;
    const atEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - 4;
    const atStart = list.scrollLeft <= 4;
    if (direction === 1 && atEnd) list.scrollTo({ left: 0, behavior: "smooth" });
    else if (direction === -1 && atStart) list.scrollTo({ left: list.scrollWidth, behavior: "smooth" });
    else list.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  useEffect(() => {
    if (!several || !playing || held || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => move(1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [several, playing, held]);

  return (
    <div
      role="group"
      aria-roledescription="carrossel"
      aria-label="Studios no Nailo App"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <ul ref={track} className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] motion-reduce:scroll-auto">
        {ordered.map((studio) => (
          <li key={studio.slug} className={`shrink-0 snap-start ${several ? "w-[85%] md:w-[calc(50%-0.625rem)]" : "w-full"}`}>
            <a href={`/${studio.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-3xl bg-peach-100 shadow-soft">
              <Image
                src={studio.banner.src}
                alt=""
                fill
                sizes={several ? "(max-width: 768px) 85vw, 480px" : "(max-width: 1024px) 100vw, 960px"}
                className="object-cover transition-[scale] duration-700 ease-(--ease-out-soft) group-hover:scale-105 motion-reduce:transition-none"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              {studio.logo && (
                <span className="absolute top-4 left-4 rounded-2xl bg-surface/95 px-3 py-2 shadow-soft">
                  <Image src={studio.logo.src} alt="" width={studio.logo.width} height={studio.logo.height} sizes="120px" className="h-7 w-auto max-w-28 object-contain" />
                </span>
              )}
              <span className="absolute right-5 bottom-5 left-5 flex items-end justify-between gap-3 text-cream">
                <span className="min-w-0">
                  <span className="block truncate text-2xl font-bold">{studio.name}</span>
                  <span className="block truncate text-sm text-cream/80">{studio.tagline}</span>
                </span>
                <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-cream px-4 font-semibold text-ink">
                  Abrir site
                  <ArrowSquareOutIcon size={18} aria-hidden="true" />
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      {several && (
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" aria-label="Studio anterior" className={CONTROL} onClick={() => move(-1)}>
            <CaretLeftIcon size={18} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" aria-label={playing ? "Pausar" : "Continuar"} className={CONTROL} onClick={() => setPlaying(!playing)}>
            {playing ? <PauseIcon size={18} weight="fill" aria-hidden="true" /> : <PlayIcon size={18} weight="fill" aria-hidden="true" />}
          </button>
          <button type="button" aria-label="Studio seguinte" className={CONTROL} onClick={() => move(1)}>
            <CaretRightIcon size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
