import type { Metadata } from "next";
import { ServiceForm } from "@/components/admin/service-form";
import { createService } from "@/lib/actions/services";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Novo serviço" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

export default async function NewServicePage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-semibold">Novo serviço</h1>
      <ServiceForm action={createService} />
    </div>
  );
}
