import type { Metadata } from "next";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  ChatCircleDotsIcon,
  InstagramLogoIcon,
  TrendUpIcon,
  UsersIcon,
} from "@phosphor-icons/react/ssr";
import { DailyChart, DemandChart, RankingChart } from "@/components/admin/analytics/charts";
import { ANALYTICS_PERIODS, getAnalytics, parsePeriod } from "@/lib/data/analytics";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Estatísticas" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CHANNELS = { whatsapp: "WhatsApp", instagram: "Instagram" } as const;
const SOURCES: Record<string, string> = {
  hero: "topo",
  footer: "rodapé",
  portfolio: "portfólio",
  "no-services": "sem serviços",
};

const percent = new Intl.NumberFormat("pt-PT", { style: "percent", maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const asDate = (day: string) => new Date(`${day}T12:00:00Z`);

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/estatisticas">) {
  const days = parsePeriod((await searchParams).periodo);
  const stats = await getAnalytics(days);
  const hasData = stats.visitors > 0 || stats.bookings > 0 || stats.whatsappClicks > 0 || stats.instagramClicks > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Estatísticas</h1>
          <p className="text-ink-muted">Visitas ao site e pedidos de contacto, sem cookies nem dados pessoais.</p>
        </div>
        <nav aria-label="Período">
          <ul className="flex gap-1 rounded-full bg-surface p-1 shadow-soft">
            {ANALYTICS_PERIODS.map((period) => {
              const active = period === days;
              return (
                <li key={period}>
                  <Link
                    href={`/admin/estatisticas?periodo=${period}`}
                    aria-current={active ? "page" : undefined}
                    scroll={false}
                    className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
                      active ? "bg-ink text-cream" : "text-ink-muted hover:bg-peach-50 hover:text-ink"
                    }`}
                  >
                    {period} dias
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={UsersIcon} label="Visitantes" value={stats.visitors.toLocaleString("pt-PT")}>
          {stats.pageviews.toLocaleString("pt-PT")} {stats.pageviews === 1 ? "visita" : "visitas"} à página
        </StatCard>
        <StatCard icon={ChatCircleDotsIcon} label="Contactos" value={stats.contacts.toLocaleString("pt-PT")}>
          {stats.bookings} {stats.bookings === 1 ? "pedido de marcação" : "pedidos de marcação"} ·{" "}
          {stats.whatsappClicks} {stats.whatsappClicks === 1 ? "clique" : "cliques"} no WhatsApp
        </StatCard>
        <StatCard
          icon={TrendUpIcon}
          label="Taxa de conversão"
          value={stats.conversionRate === null ? "—" : percent.format(stats.conversionRate)}
        >
          dos visitantes entraram em contacto
        </StatCard>
        <StatCard
          icon={InstagramLogoIcon}
          label="Cliques no Instagram"
          value={stats.instagramClicks.toLocaleString("pt-PT")}
        >
          visitantes que foram ver o seu Instagram
        </StatCard>
      </ul>

      {!hasData ? (
        <p className="rounded-3xl bg-surface p-8 text-center text-ink-muted shadow-soft">
          Ainda não há dados nos últimos {days} dias. As estatísticas aparecem assim que alguém visitar o
          site. As suas próprias visitas, com sessão iniciada, não contam.
        </p>
      ) : (
        <>
          <DailyChart
            title="Visitantes e contactos por dia"
            description={`Últimos ${days} dias.`}
            data={stats.daily.map((d) => ({
              day: d.day,
              label: longDate.format(asDate(d.day)),
              axisLabel: shortDate.format(asDate(d.day)),
              visitors: d.visitors,
              contacts: d.contacts,
            }))}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <RankingChart
              title="Serviços mais pedidos"
              description={
                stats.bookings > 0
                  ? `Quantas vezes cada serviço foi pedido. Valor total pedido: ${formatPrice(stats.requestedValueCents)}.`
                  : undefined
              }
              data={stats.services.map((s) => ({ key: s.name, label: s.name, axisLabel: s.name, count: s.count }))}
              empty="Ainda não há pedidos de marcação neste período."
            />
            <RankingChart
              title="Cliques nos links"
              description="Contactos diretos pelo WhatsApp e visitas ao Instagram, por zona do site."
              data={stats.linkClicks.map((c) => {
                const label = `${CHANNELS[c.channel]} · ${SOURCES[c.source] ?? c.source}`;
                return { key: `${c.channel}-${c.source}`, label, axisLabel: label, count: c.count };
              })}
              empty="Ainda não há cliques nos links do WhatsApp ou do Instagram neste período."
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DemandChart
              title="Dias mais procurados"
              description="Dia da semana pedido para a marcação."
              unit="Dia da semana"
              data={stats.weekdays.map((w) => ({
                key: String(w.weekday),
                label: WEEKDAYS[w.weekday],
                axisLabel: WEEKDAYS[w.weekday].slice(0, 3),
                count: w.count,
              }))}
            />
            <DemandChart
              title="Horas mais procuradas"
              description="Hora de início pedida para a marcação."
              unit="Hora"
              data={stats.hours.map((h) => ({
                key: String(h.hour),
                label: `${h.hour}h`,
                axisLabel: `${h.hour}h`,
                count: h.count,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: IconComponent,
  label,
  value,
  children,
}: {
  icon: Icon;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1 rounded-3xl bg-surface p-5 shadow-soft">
      <p className="inline-flex items-center gap-2 text-sm font-bold text-ink-muted">
        <span className="flex size-8 items-center justify-center rounded-xl bg-peach-100 text-accent">
          <IconComponent size={18} weight="duotone" aria-hidden="true" />
        </span>
        {label}
      </p>
      <p className="font-display mt-1 text-4xl font-bold lining-nums tabular-nums">{value}</p>
      <p className="text-sm text-ink-muted">{children}</p>
    </li>
  );
}
