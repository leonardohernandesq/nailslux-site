import type { Metadata } from "next";
import Image from "next/image";
import { CaptionForm } from "@/components/admin/caption-form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { PortfolioUploader } from "@/components/admin/portfolio-uploader";
import { deletePortfolioItem, updatePortfolioCaption } from "@/lib/actions/portfolio";
import { PORTFOLIO_MAX_ITEMS } from "@/lib/constants";
import { getAdminPortfolio } from "@/lib/data/portfolio";

export const metadata: Metadata = { title: "Portfólio" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

export default async function PortfolioAdminPage() {
  const items = await getAdminPortfolio();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Portfólio</h1>
        <p className="text-ink-muted">
          As fotografias mais recentes aparecem primeiro no site. São otimizadas automaticamente. Pode ter
          até {PORTFOLIO_MAX_ITEMS}.
        </p>
      </div>

      <PortfolioUploader count={items.length} />

      {items.length === 0 ? (
        <p className="rounded-3xl bg-surface p-8 text-center text-ink-muted shadow-soft">
          Ainda não há fotografias. Adicione as primeiras acima.
        </p>
      ) : (
        <>
          <h2 className="font-display text-2xl font-semibold">
            {items.length} {items.length === 1 ? "fotografia" : "fotografias"}
          </h2>
          <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <li key={item.id} className="overflow-hidden rounded-3xl bg-surface shadow-soft">
                {/* Same 4:5 crop as on the site, so what you see here is what clients see. */}
                <div className="relative aspect-4/5 bg-peach-100">
                  <Image
                    src={item.src}
                    alt={item.caption ?? `Fotografia ${i + 1} do portfólio`}
                    fill
                    placeholder="blur"
                    blurDataURL={item.blurDataUrl}
                    sizes="(min-width: 1024px) 320px, (min-width: 420px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex items-start gap-1 p-3">
                  <div className="min-w-0 flex-1">
                    <CaptionForm
                      action={updatePortfolioCaption.bind(null, item.id)}
                      caption={item.caption}
                      inputId={`caption-${item.id}`}
                    />
                  </div>
                  <ConfirmDelete
                    action={deletePortfolioItem.bind(null, item.id)}
                    itemLabel={`fotografia ${i + 1}`}
                    description="A fotografia é removida do site e apagada definitivamente."
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
