import type { AppointmentStatus } from "@/lib/db/models";

const STATUS: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: "Por confirmar", className: "bg-peach-100 text-accent-hover" },
  confirmed: { label: "Confirmada", className: "bg-success-soft text-success" },
  declined: { label: "Recusada", className: "bg-line/60 text-ink-muted" },
  cancelled: { label: "Cancelada", className: "bg-line/60 text-ink-muted" },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, className } = STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
  );
}
