import type { ReactNode } from "react";
import { CheckCircleIcon, CheckIcon, LockSimpleIcon, WhatsappLogoIcon } from "@phosphor-icons/react/ssr";

// The product shown on the landing page: small HTML versions of real screens, with
// example data. `picked` starts each highlight off so the hero can animate it on.

export const DEMO_STUDIO = "Studio Exemplo";

const SERVICES = [
  { name: "Verniz gel", detail: "1h · 25,00 €" },
  { name: "Pedicure", detail: "45 min · 18,00 €" },
  { name: "Nail art", detail: "30 min · 5,00 €" },
];

const SLOTS = [
  { time: "09:30" },
  { time: "10:00", busy: true },
  { time: "10:30", chosen: true },
  { time: "11:00" },
  { time: "11:30", busy: true },
  { time: "12:00" },
];

export function PhoneFrame({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative aspect-[9/17] w-64 rounded-[2.6rem] bg-ink p-2 shadow-lift ring-1 ring-white/15 ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-cream text-ink">
        <span className="absolute top-2.5 left-1/2 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-ink/15" />
        {children}
      </div>
    </div>
  );
}

function BottomBar({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="absolute inset-x-3 bottom-4 flex items-center justify-between gap-2 rounded-full bg-accent py-2.5 pr-4 pl-4 text-xs font-bold text-on-accent">
      <span>{label}</span>
      <span>{detail}</span>
    </div>
  );
}

function ScreenHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="px-4 pt-8 pb-3">
      <p className="text-[0.7rem] font-bold tracking-wide text-accent uppercase">{eyebrow}</p>
      <p className="font-display text-2xl leading-tight font-semibold">{title}</p>
    </div>
  );
}

export function ServicesScreen({ picked = true }: { picked?: boolean }) {
  return (
    <div className="absolute inset-0">
      <ScreenHeading eyebrow={DEMO_STUDIO} title="Escolha o serviço" />
      <ul className="flex flex-col gap-2 px-3">
        {SERVICES.map((service, index) => (
          <li key={service.name} className="relative rounded-2xl bg-surface px-3 py-2.5 shadow-soft">
            {index === 0 && (
              <span
                data-demo="service-picked"
                style={{ opacity: picked ? 1 : 0 }}
                className="absolute inset-0 grid place-items-center justify-end rounded-2xl pr-3 ring-2 ring-accent"
              >
                <CheckCircleIcon size={20} weight="fill" className="text-accent" />
              </span>
            )}
            <p className="text-sm font-bold">{service.name}</p>
            <p className="text-xs text-ink-muted">{service.detail}</p>
          </li>
        ))}
      </ul>
      <BottomBar label="Continuar" detail="25,00 €" />
    </div>
  );
}

export function TimeScreen({ picked = true }: { picked?: boolean }) {
  return (
    <div className="absolute inset-0">
      <ScreenHeading eyebrow="Sábado" title="Escolha a hora" />
      <ul className="grid grid-cols-2 gap-2 px-3">
        {SLOTS.map((slot) => (
          <li
            key={slot.time}
            className={`relative rounded-xl py-2.5 text-center text-sm font-bold ${
              slot.busy ? "bg-peach-50 text-ink-muted/60 line-through" : "bg-surface shadow-soft"
            }`}
          >
            {slot.time}
            {slot.chosen && (
              <span
                data-demo="time-picked"
                style={{ opacity: picked ? 1 : 0 }}
                className="absolute inset-0 grid place-items-center rounded-xl bg-accent text-on-accent"
              >
                {slot.time}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="px-4 pt-3 text-xs text-ink-muted">As horas ocupadas nunca aparecem como livres.</p>
      <BottomBar label="Pedir marcação" detail="Sáb, 10:30" />
    </div>
  );
}

export function SentScreen() {
  return (
    <div className="absolute inset-0 grid place-items-center px-5 text-center">
      <div>
        <span data-demo="sent-check" className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success">
          <CheckIcon size={32} weight="bold" />
        </span>
        <p className="font-display mt-4 text-2xl font-semibold">Pedido enviado</p>
        <p className="mt-1 text-sm text-ink-muted">Sábado às 10:30. Falta só a confirmação do studio.</p>
      </div>
    </div>
  );
}

export function WhatsAppScreen() {
  return (
    <div className="absolute inset-0 bg-[#efe7dd]">
      <div className="flex items-center gap-2 bg-[#075e54] px-4 pt-8 pb-3 text-white">
        <WhatsappLogoIcon size={20} weight="fill" />
        <p className="text-sm font-bold">{DEMO_STUDIO}</p>
      </div>
      <div className="p-3">
        <div className="ml-4 rounded-2xl rounded-tr-sm bg-[#dcf8c6] p-3 text-xs leading-relaxed shadow-sm">
          <p>Olá, {DEMO_STUDIO}! Gostaria de fazer uma marcação.</p>
          <p className="mt-2">
            <b>Nome:</b> Maria
            <br />
            <b>Serviço:</b> Verniz gel (25,00 €)
            <br />
            <b>Data:</b> sábado
            <br />
            <b>Hora:</b> 10:30
          </p>
          <p className="mt-2">Fico a aguardar a confirmação.</p>
        </div>
      </div>
    </div>
  );
}

export function ConfirmedScreen() {
  return (
    <div className="absolute inset-0">
      <ScreenHeading eyebrow="Painel" title="Marcações" />
      <div className="mx-3 rounded-2xl bg-surface p-3 shadow-soft">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold">Maria</p>
            <p className="text-xs text-ink-muted">Verniz gel · sábado, 10:30</p>
          </div>
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[0.65rem] font-bold text-success">Confirmada</span>
        </div>
      </div>
      <p className="mx-3 mt-2 flex items-center gap-2 rounded-2xl bg-peach-50 p-3 text-xs font-semibold">
        <LockSimpleIcon size={16} weight="fill" className="shrink-0 text-accent" />
        10:30 ficou bloqueado no site.
      </p>
      <p className="mx-4 mt-4 text-[0.7rem] font-bold tracking-wide text-ink-muted uppercase">A seguir</p>
      <ul className="mx-3 mt-1.5 flex flex-col gap-1.5">
        {[
          ["14:00", "Joana · Pedicure"],
          ["16:30", "Rita · Nail art"],
        ].map(([time, who]) => (
          <li key={time} className="flex gap-2 rounded-xl bg-surface px-3 py-2 text-xs shadow-soft">
            <b>{time}</b>
            <span className="text-ink-muted">{who}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
