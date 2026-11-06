import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { BrandSettings } from "@/components/admin/brand-settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { GrantTime } from "@/components/platform/grant-time";
import { daysUntil, getAccessGrants, getSubscriptionDetails } from "@/lib/billing/details";
import { requirePlatformAdmin } from "@/lib/auth/dal";
import { getTenantById } from "@/lib/data/tenants";

export const metadata: Metadata = { title: "Editar studio" };

// Auth-gated and per-request: allowed to block (see app/backoffice/(panel)/layout.tsx).
export const instant = false;

const longDate = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });

export default async function StudioEditPage({ params }: PageProps<"/backoffice/studios/[id]">) {
  await requirePlatformAdmin();
  const { id } = await params;
  const tenant = isValidObjectId(id) ? await getTenantById(id) : null;
  if (!tenant) notFound();
  const [details, grants] = await Promise.all([getSubscriptionDetails(tenant.id), getAccessGrants(tenant.id)]);
  const billedDirectly = tenant.status === "active" && !tenant.hasBillingAccount;
  const paying = tenant.subscriptionStatus === "active" || tenant.subscriptionStatus === "trialing";

  return (
    <>
      <Link href="/backoffice" className="inline-flex min-h-11 items-center gap-2 font-semibold text-ink-muted hover:text-ink">
        <ArrowLeftIcon size={18} aria-hidden="true" />
        Voltar aos studios
      </Link>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{tenant.name}</h1>
      <p className="mt-1 mb-6 text-ink-muted">As alterações aparecem logo no site deste studio.</p>
      <section aria-labelledby="billing-title" className="mb-6 flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
        <h2 id="billing-title" className="font-display text-2xl font-semibold">
          Subscrição
        </h2>
        {billedDirectly ? (
          <p className="text-ink-muted">Pago fora da Stripe: não há subscrição para gerir aqui.</p>
        ) : (
          <>
            <p>
              Estado na Stripe: <strong>{details?.status ?? tenant.subscriptionStatus ?? "sem subscrição"}</strong>
              {details && details.status !== "canceled" && (
                <>
                  {" · "}
                  {details.ending ? "termina" : details.free ? "grátis até" : "renova"} a{" "}
                  <strong>{longDate.format(new Date(details.nextDate))}</strong> ({daysUntil(details.nextDate)} dias)
                  {details.free && !details.hasCard && " · sem cartão"}
                </>
              )}
            </p>
            <GrantTime studioId={tenant.id} extendsSubscription={paying} />
          </>
        )}
        {grants.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-ink-muted">Tempo oferecido</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {grants.map((grant) => (
                <li key={grant.at}>
                  {longDate.format(new Date(grant.at))}: {grant.amount} {grant.unit === "days" ? (grant.amount === 1 ? "dia" : "dias") : grant.amount === 1 ? "mês" : "meses"}, até{" "}
                  {longDate.format(new Date(grant.until))} <span className="text-ink-muted">· por {grant.by}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <BrandSettings brand={tenant.brand} studioId={tenant.id} />
      <SettingsForm tenant={tenant} studioId={tenant.id} />
    </>
  );
}
