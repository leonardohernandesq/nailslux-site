import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth/dal";
import { getTenantById } from "@/lib/data/tenants";

export const metadata: Metadata = { title: "Definições" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

export default async function SettingsPage({ searchParams }: PageProps<"/admin/definicoes">) {
  const { tenantId } = await requireAdmin();
  const tenant = await getTenantById(tenantId);
  if (!tenant) notFound();
  const { novo } = await searchParams;

  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">{novo ? "Bem-vinda!" : "Definições"}</h1>
      <p className="mt-1 mb-6 text-ink-muted">
        {novo
          ? "Confirme os dados do studio. Depois adicione os serviços e as fotografias."
          : "Estes dados aparecem no seu site."}
      </p>
      <SettingsForm tenant={tenant} />
      <p className="mt-6 text-center">
        <Link href="/admin/subscricao" className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">
          Ver subscrição
        </Link>
      </p>
    </>
  );
}
