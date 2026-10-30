"use client";

import type { ReactNode } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** The part of Recharts' tooltip props our custom tooltips read. */
type TooltipProps = {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
};

// Recharts writes colours as SVG attributes, so the theme tokens are repeated here
// (keep in sync with .nailo in app/globals.css).
const COLORS = {
  accent: "#c93f2a",
  peach: "#c9cfe6",
  peach50: "#eceef6",
  peach100: "#dfe2ef",
  ink: "#16213e",
  muted: "#4a5270",
  line: "#e1e4ef",
} as const;

const AXIS_TICK = { fill: COLORS.muted, fontSize: 12 };

export type DailyPoint = {
  day: string;
  label: string;
  axisLabel: string;
  visitors: number;
  contacts: number;
};
export type CountPoint = {
  key: string;
  label: string;
  axisLabel: string;
  count: number;
};

/** Visitors (area) and contacts (bars) per day. */
export function DailyChart({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data: DailyPoint[];
}) {
  return (
    <ChartCard title={title} description={description}>
      <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-4 text-sm text-ink-muted">
        <li className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-peach-200" /> Visitantes
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-accent" /> Contactos
        </li>
      </ul>
      <div aria-hidden="true" className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="visitors-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.peach} stopOpacity={0.9} />
                <stop offset="100%" stopColor={COLORS.peach} stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={COLORS.line} />
            <XAxis
              dataKey="axisLabel"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: COLORS.line }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip content={DailyTooltip} cursor={{ fill: COLORS.peach100, opacity: 0.5 }} />
            <Area
              type="monotone"
              dataKey="visitors"
              name="Visitantes"
              stroke={COLORS.peach}
              strokeWidth={2}
              fill="url(#visitors-fill)"
            />
            <Bar
              dataKey="contacts"
              name="Contactos"
              fill={COLORS.accent}
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        caption={title}
        headers={["Dia", "Visitantes", "Contactos"]}
        rows={data.map((d) => [d.label, d.visitors, d.contacts])}
      />
    </ChartCard>
  );
}

/** Column chart where the busiest column(s) stand out, e.g. demand by weekday or hour. */
export function DemandChart({
  title,
  description,
  unit,
  data,
}: {
  title: string;
  description?: string;
  unit: string;
  data: CountPoint[];
}) {
  const peak = Math.max(0, ...data.map((d) => d.count));
  return (
    <ChartCard title={title} description={description}>
      <div aria-hidden="true" className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke={COLORS.line} />
            <XAxis
              dataKey="axisLabel"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: COLORS.line }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip content={CountTooltip} cursor={{ fill: COLORS.peach100, opacity: 0.5 }} />
            <Bar dataKey="count" name="Pedidos" radius={[6, 6, 0, 0]} maxBarSize={44}>
              {data.map((d) => (
                <Cell key={d.key} fill={d.count > 0 && d.count === peak ? COLORS.accent : COLORS.peach} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                fill={COLORS.muted}
                fontSize={12}
                fontWeight={700}
                formatter={(value) => (Number(value) > 0 ? String(value) : "")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption={title} headers={[unit, "Pedidos"]} rows={data.map((d) => [d.label, d.count])} />
    </ChartCard>
  );
}

/** Horizontal ranking with counts and shares, e.g. most requested services. */
export function RankingChart({
  title,
  description,
  data,
  empty,
}: {
  title: string;
  description?: ReactNode;
  data: CountPoint[];
  empty: string;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const rows = data.map((d) => ({
    ...d,
    share: `${d.count} (${Math.round((d.count / total) * 100)}%)`,
  }));

  return (
    <ChartCard title={title} description={description}>
      {rows.length === 0 ? (
        <p className="mt-4 text-ink-muted">{empty}</p>
      ) : (
        <>
          <div aria-hidden="true" className="mt-4" style={{ height: rows.length * 44 + 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="axisLabel"
                  width={120}
                  tick={{ fill: COLORS.ink, fontSize: 13, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={CountTooltip} cursor={{ fill: COLORS.peach100, opacity: 0.5 }} />
                <Bar
                  dataKey="count"
                  name="Total"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                  background={{ fill: COLORS.peach50, radius: 6 }}
                >
                  {rows.map((d, i) => (
                    <Cell key={d.key} fill={i === 0 ? COLORS.accent : COLORS.peach} />
                  ))}
                  <LabelList
                    dataKey="share"
                    position="right"
                    fill={COLORS.ink}
                    fontSize={12}
                    fontWeight={700}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable caption={title} headers={["", "Total"]} rows={rows.map((d) => [d.label, d.share])} />
        </>
      )}
    </ChartCard>
  );
}

function DailyTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as DailyPoint;
  return (
    <TooltipBox title={point.label}>
      <p>
        <span className="font-bold tabular-nums">{point.visitors}</span> visitantes
      </p>
      <p className="text-accent">
        <span className="font-bold tabular-nums">{point.contacts}</span> contactos
      </p>
    </TooltipBox>
  );
}

function CountTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as CountPoint;
  return (
    <TooltipBox title={point.label}>
      <p className="font-bold tabular-nums">{point.count}</p>
    </TooltipBox>
  );
}

function TooltipBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-lift">
      <p className="mb-1 font-semibold first-letter:uppercase">{title}</p>
      {children}
    </div>
  );
}

/**
 * The charts are drawings; screen readers get the same numbers as a table. The
 * wrapper is what's visually hidden: tables ignore the 1px width of sr-only and
 * would widen the page.
 */
function DataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, ...values]) => (
            <tr key={String(label)}>
              <th scope="row">{label}</th>
              {values.map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-3xl bg-surface p-5 shadow-soft sm:p-6">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      {children}
    </section>
  );
}
