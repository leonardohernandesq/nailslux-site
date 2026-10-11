import { TimerIcon } from "@phosphor-icons/react/ssr";
import { ServiceSelectButton } from "@/components/booking/service-select-button";
import type { ServiceDTO } from "@/lib/data/services";
import { formatDuration, formatPrice } from "@/lib/format";
import { SectionHeading } from "./section-heading";

export function ServicesSection({ services }: { services: ServiceDTO[] }) {
  return (
    <section id="servicos" aria-labelledby="servicos-title" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="servicos-title" eyebrow="Serviços" title="Escolha o seu cuidado">
          Escolha um ou mais serviços e siga para a marcação.
        </SectionHeading>

        {services.length === 0 ? (
          <p className="rounded-3xl bg-surface p-8 text-center text-ink-muted shadow-soft">
            Os serviços vão ser publicados em breve.
          </p>
        ) : (
          <ul data-reveal-group className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li
                key={service.id}
                className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-soft transition-[box-shadow,border-color] duration-300 hover:shadow-lift has-[button[data-selected]]:border-accent/50 has-[button[data-selected]]:shadow-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-2xl leading-tight font-semibold">{service.name}</h3>
                  <p className="shrink-0 rounded-full bg-peach-50 px-3 py-1 font-bold text-accent tabular-nums">
                    {formatPrice(service.priceCents)}
                  </p>
                </div>
                {service.description && <p className="text-ink-muted">{service.description}</p>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                  {service.durationMinutes ? (
                    <p className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                      <TimerIcon size={18} aria-hidden="true" />
                      <span className="sr-only">Duração:</span>
                      {formatDuration(service.durationMinutes)}
                    </p>
                  ) : (
                    <span />
                  )}
                  <ServiceSelectButton id={service.id} name={service.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
