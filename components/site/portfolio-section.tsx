import { InstagramLogoIcon } from "@phosphor-icons/react/ssr";
import type { PortfolioItemDTO } from "@/lib/data/portfolio";
import { buttonClasses } from "@/components/ui/button";
import { Gallery } from "./gallery";
import { SectionHeading } from "./section-heading";

export function PortfolioSection({
  items,
  instagramUrl,
}: {
  items: PortfolioItemDTO[];
  instagramUrl: string | null;
}) {
  return (
    <section id="portfolio" aria-labelledby="portfolio-title" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="portfolio-title" eyebrow="Portfólio" title="Trabalhos recentes">
          Um pouco do que sai das nossas mãos.
        </SectionHeading>

        {items.length === 0 ? (
          <p className="rounded-3xl bg-surface p-8 text-center text-ink-muted shadow-soft">
            As primeiras fotografias chegam em breve.
          </p>
        ) : (
          <Gallery items={items} />
        )}

        {instagramUrl && (
          <div className="mt-10 text-center">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "secondary" })}
            >
              <InstagramLogoIcon size={22} aria-hidden="true" />
              Ver mais no Instagram
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
