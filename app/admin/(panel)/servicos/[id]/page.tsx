import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/admin/service-form";
import { updateService } from "@/lib/actions/services";
import { getServiceById } from "@/lib/data/services";

export const metadata: Metadata = { title: "Editar serviço" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

export default async function EditServicePage({ params }: PageProps<"/admin/servicos/[id]">) {
  const { id } = await params;
  const service = await getServiceById(id);
  if (!service) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-semibold">Editar serviço</h1>
      <ServiceForm action={updateService.bind(null, service.id)} service={service} />
    </div>
  );
}
