import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import type { StudioBrand } from "@/lib/studio-brand";

const NAV = [
  { href: "#servicos", label: "Serviços" },
  { href: "#portfolio", label: "Portfólio" },
  { href: "#como-funciona", label: "Como funciona" },
];

export function SiteHeader({ tenantSlug, studioName, logo }: { tenantSlug: string; studioName: string; logo: StudioBrand["logo"] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <Link href={`/${tenantSlug}`} aria-label={`${studioName}, início`} className="shrink-0">
          {logo ? (
            <Image src={logo.src} alt="" width={logo.width} height={logo.height} priority className="h-9 w-auto max-w-44 object-contain sm:h-11 sm:max-w-64" />
          ) : (
            <span className="font-display text-2xl font-semibold sm:text-3xl">{studioName}</span>
          )}
        </Link>
        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-full px-4 py-2 font-semibold text-ink-muted transition-colors hover:bg-peach-50 hover:text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a href="#marcar" className={buttonClasses({ size: "sm" })}>
          Marcar horário
        </a>
      </div>
    </header>
  );
}
