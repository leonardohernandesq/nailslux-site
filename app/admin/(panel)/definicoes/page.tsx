import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgendaSettings } from "@/components/admin/agenda-settings";
import { BrandSettings } from "@/components/admin/brand-settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { TimeOffManager } from "@/components/admin/time-off-manager";
import { lisbonDay } from "@/lib/analytics/server";
import { requireAdmin } from "@/lib/auth/dal";
import { getPanelSettings, getTenantById } from "@/lib/data/tenants";
import { canSendMail } from "@/lib/mail";

export const metadata: Metadata = { title: "Definições" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

export default async function SettingsPage({ searchParams }: PageProps<"/admin/definicoes">) {
  const { tenantId, email } = await requireAdmin();
  const today = lisbonDay(new Date());
  const [tenant, panel] = await Promise.all([getTenantById(tenantId), getPanelSettings(tenantId, today)]);
  if (!tenant) notFound();
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const { novo } = await searchParams;

  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">{novo ? "Bem-vinda!" : "Definições"}</h1>
      <p className="mt-1 mb-6 text-ink-muted">
        {novo
          ? "Confirme os dados do studio. Depois adicione os serviços e as fotografias."
          : "Estes dados aparecem no seu site."}
      </p>
      <BrandSettings brand={tenant.brand} />
      <SettingsForm tenant={tenant} />
      <TimeOffManager timeOff={panel.timeOff} today={today} />
      <AgendaSettings
        calendarUrl={panel.calendarToken ? `${base}/api/agenda/${panel.calendarToken}` : null}
        notifyNewBookings={panel.notifyNewBookings}
        email={email}
        mailReady={canSendMail()}
      />
      <p className="mt-6 text-center">
        <Link href="/admin/subscricao" className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">
          Ver subscrição
        </Link>
      </p>
    </>
  );
}
