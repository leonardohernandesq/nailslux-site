import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { BrandSettings } from "@/components/admin/brand-settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { requirePlatformAdmin } from "@/lib/auth/dal";
import { getTenantById } from "@/lib/data/tenants";

export const metadata: Metadata = { title: "Editar studio" };

// Auth-gated and per-request: allowed to block (see app/backoffice/(panel)/layout.tsx).
export const instant = false;

export default async function StudioEditPage({ params }: PageProps<"/backoffice/studios/[id]">) {
  await requirePlatformAdmin();
  const { id } = await params;
  const tenant = isValidObjectId(id) ? await getTenantById(id) : null;
  if (!tenant) notFound();

  return (
    <>
      <Link href="/backoffice" className="inline-flex min-h-11 items-center gap-2 font-semibold text-ink-muted hover:text-ink">
        <ArrowLeftIcon size={18} aria-hidden="true" />
        Voltar aos studios
      </Link>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{tenant.name}</h1>
      <p className="mt-1 mb-6 text-ink-muted">As alterações aparecem logo no site deste studio.</p>
      <BrandSettings brand={tenant.brand} studioId={tenant.id} />
      <SettingsForm tenant={tenant} studioId={tenant.id} />
    </>
  );
}
