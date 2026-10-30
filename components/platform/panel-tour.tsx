"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import {
  CalendarCheckIcon,
  ChartBarIcon,
  HandHeartIcon,
  ImageIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { gsap, MOTION, MOTION_OK, useGSAP } from "@/lib/gsap";
import heroImage from "@/public/brand/hero-hands.webp";

const TABS: { id: string; label: string; icon: Icon; caption: string }[] = [
  { id: "marcacoes", label: "Marcações", icon: CalendarCheckIcon, caption: "Pedidos e agenda, com os moldes de cada cliente guardados." },
  { id: "servicos", label: "Serviços", icon: HandHeartIcon, caption: "Altere preços e durações. O site atualiza na hora." },
  { id: "portfolio", label: "Portfólio", icon: ImageIcon, caption: "Até 30 fotografias, otimizadas automaticamente." },
  { id: "estatisticas", label: "Estatísticas", icon: ChartBarIcon, caption: "Visitas, pedidos e os dias e horas mais procurados." },
];

const BOOKINGS = [
  { name: "Maria", detail: "Verniz gel · sáb, 10:30", status: "Pendente", tone: "bg-peach-100 text-accent-hover" },
  { name: "Joana", detail: "Pedicure · sáb, 14:00", status: "Confirmada", tone: "bg-success-soft text-success" },
  { name: "Rita", detail: "Nail art · seg, 09:30", status: "Confirmada", tone: "bg-success-soft text-success" },
];

const SERVICES = [
  { name: "Verniz gel", price: "25,00 €", time: "1h" },
  { name: "Pedicure", price: "18,00 €", time: "45 min" },
  { name: "Nail art", price: "5,00 €", time: "30 min" },
];

const WEEKDAYS = [
  { day: "Seg", value: 35 },
  { day: "Ter", value: 50 },
  { day: "Qua", value: 42 },
  { day: "Qui", value: 68 },
  { day: "Sex", value: 88 },
  { day: "Sáb", value: 100 },
  { day: "Dom", value: 22 },
];

const PHOTO_CROPS = ["object-[20%_30%]", "object-[60%_40%]", "object-[80%_70%]", "object-[40%_80%]", "object-[50%_20%]", "object-[10%_60%]"];

function Row({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <li data-tour-item className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3.5 shadow-soft">
      <div className="min-w-0">
        <p className="truncate font-bold">{title}</p>
        <p className="truncate text-sm text-ink-muted">{detail}</p>
      </div>
      {children}
    </li>
  );
}

function TabPanel({ id }: { id: string }) {
  if (id === "marcacoes") {
    return (
      <ul className="flex flex-col gap-2.5">
        {BOOKINGS.map((booking) => (
          <Row key={booking.name} title={booking.name} detail={booking.detail}>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${booking.tone}`}>{booking.status}</span>
          </Row>
        ))}
        <li data-tour-item className="rounded-2xl bg-peach-50 p-3.5">
          <p className="text-sm font-bold">Moldes da Maria</p>
          <div className="mt-2 flex gap-1.5">
            {[3, 6, 5, 7, 9].map((size, index) => (
              <span key={index} className="grid size-9 place-items-center rounded-lg bg-surface text-sm font-bold shadow-soft">
                {size}
              </span>
            ))}
          </div>
        </li>
      </ul>
    );
  }
  if (id === "servicos") {
    return (
      <ul className="flex flex-col gap-2.5">
        {SERVICES.map((service) => (
          <Row key={service.name} title={service.name} detail={service.time}>
            <span className="shrink-0 font-bold">{service.price}</span>
          </Row>
        ))}
      </ul>
    );
  }
  if (id === "portfolio") {
    return (
      <ul className="grid grid-cols-3 gap-2.5">
        {PHOTO_CROPS.map((crop) => (
          <li key={crop} data-tour-item className="relative aspect-square overflow-hidden rounded-2xl bg-peach-100">
            <Image src={heroImage} alt="" fill sizes="160px" className={`object-cover ${crop}`} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div>
      <p className="text-sm font-bold">Pedidos por dia da semana</p>
      <ul className="mt-4 flex h-44 items-end gap-2">
        {WEEKDAYS.map(({ day, value }) => (
          <li key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span
              data-tour-bar
              style={{ height: `${value}%` }}
              className="w-full origin-bottom rounded-t-lg bg-gradient-to-t from-brand-coral to-brand-amber"
            />
            <span className="text-xs font-semibold text-ink-muted">{day}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The real panel's four areas, with example data. The tabs work like a real tablist. */
export function PanelTour() {
  const root = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(TABS[0].id);
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Each tab has only one of these, so look them up first.
        const items = gsap.utils.toArray<HTMLElement>("[data-tour-item]");
        const bars = gsap.utils.toArray<HTMLElement>("[data-tour-bar]");
        if (items.length > 0) gsap.from(items, { opacity: 0, y: 10, duration: MOTION.base, ease: MOTION.easeOut, stagger: MOTION.stagger });
        if (bars.length > 0) gsap.from(bars, { scaleY: 0, duration: MOTION.slow, ease: MOTION.easeOut, stagger: MOTION.stagger });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [tab], revertOnUpdate: true },
  );

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const index = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(index + delta + TABS.length) % TABS.length];
    setTab(next.id);
    root.current?.querySelector<HTMLElement>(`#tab-${next.id}`)?.focus();
  }

  return (
    <div ref={root} className="overflow-hidden rounded-3xl bg-cream text-ink shadow-lift ring-1 ring-white/10">
      <div className="flex items-center gap-1.5 border-b border-line bg-surface px-4 py-3">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="size-2.5 rounded-full bg-line-strong" />
        ))}
        <span className="ml-3 text-xs font-semibold text-ink-muted">Painel do studio · dados de exemplo</span>
      </div>
      <div className="grid md:grid-cols-[13rem_1fr]">
        <div
          role="tablist"
          aria-label="Áreas do painel"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="flex gap-1 overflow-x-auto border-b border-line p-2 md:flex-col md:border-r md:border-b-0 md:p-3"
        >
          {TABS.map(({ id, label, icon: TabIcon }) => (
            <button
              key={id}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="tour-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors duration-200 ${
                tab === id ? "bg-accent text-on-accent" : "text-ink-muted hover:bg-peach-50 hover:text-ink"
              }`}
            >
              <TabIcon size={18} weight={tab === id ? "fill" : "regular"} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <div id="tour-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-[24rem] p-4 sm:p-6">
          <p className="font-display text-2xl font-semibold">{current.label}</p>
          <p className="mt-1 mb-5 text-sm text-ink-muted">{current.caption}</p>
          <TabPanel id={tab} />
        </div>
      </div>
    </div>
  );
}
