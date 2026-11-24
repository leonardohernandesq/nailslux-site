import Link from "next/link";
import { ArrowRightIcon, CalendarXIcon, CalendarDotsIcon } from "@phosphor-icons/react/ssr";
import type { AppointmentChangeKind } from "@/lib/db/models";
import { formatLongDate } from "@/lib/format";

export type ChangeLogItem = {
  kind: AppointmentChangeKind;
  /** ISO, when the studio made the change. */
  at: string;
  reason?: string;
  fromDate: string;
  fromTime: string;
  toDate?: string;
  toTime?: string;
  /** On the client card: what the appointment was and where to open it. */
  serviceNames?: string[];
  appointmentId?: string;
};

const LABEL: Record<AppointmentChangeKind, string> = {
  declined: "Pedido cancelado",
  cancelled: "Marcação cancelada",
  rescheduled: "Remarcada",
};

const loggedAt = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" });
const shortDate = (date: string) => formatLongDate(date).replace(/ de \d{4}$/, "");

/** Cancellations and reschedules, with the studio's note on what happened. */
export function ChangeLog({ items }: { items: ChangeLogItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => {
        const rescheduled = item.kind === "rescheduled";
        const Icon = rescheduled ? CalendarDotsIcon : CalendarXIcon;
        const body = (
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="flex items-center gap-2 font-semibold">
                <Icon size={20} aria-hidden="true" className={rescheduled ? "text-accent" : "text-danger"} />
                {LABEL[item.kind]}
              </p>
              <time dateTime={item.at} className="text-sm text-ink-muted">
                {loggedAt.format(new Date(item.at))}
              </time>
            </div>
            <p className="mt-1 text-sm first-letter:uppercase">
              {rescheduled && item.toDate ? (
                <>
                  <span className="text-ink-muted line-through decoration-ink-muted/50">
                    {shortDate(item.fromDate)}, {item.fromTime}
                  </span>
                  <ArrowRightIcon size={14} aria-label="para" className="mx-1.5 inline align-[-2px]" />
                  <span className="font-semibold">
                    {shortDate(item.toDate)}, {item.toTime}
                  </span>
                </>
              ) : (
                <>
                  {shortDate(item.fromDate)}, {item.fromTime}
                </>
              )}
              {item.serviceNames && <span className="text-ink-muted"> · {item.serviceNames.join(", ")}</span>}
            </p>
            {item.reason ? (
              <p className="mt-2 rounded-2xl bg-peach-50 px-3 py-2 text-sm wrap-anywhere">{item.reason}</p>
            ) : (
              <p className="mt-2 text-sm text-ink-muted italic">Sem nota.</p>
            )}
          </>
        );
        return (
          <li key={`${item.appointmentId ?? ""}-${item.at}-${index}`}>
            {item.appointmentId ? (
              <Link
                href={`/admin/marcacoes/${item.appointmentId}`}
                className="block rounded-3xl bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift"
              >
                {body}
              </Link>
            ) : (
              <div className="rounded-3xl bg-surface p-4 shadow-soft">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
