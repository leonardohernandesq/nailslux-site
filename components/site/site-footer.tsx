import Image from "next/image";
import Link from "next/link";
import { ClockIcon, InstagramLogoIcon, MapPinIcon, WhatsappLogoIcon } from "@phosphor-icons/react/ssr";
import type { TenantDTO } from "@/lib/data/tenants";
import { formatOpeningDays, formatPhoneForDisplay } from "@/lib/site";
import type { StudioBrand } from "@/lib/studio-brand";

export function SiteFooter({ tenant, logo }: { tenant: TenantDTO; logo: StudioBrand["logo"] }) {
  const { name, tagline, whatsappNumber, instagramUrl, address, hours } = tenant;
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          {logo ? (
            <Image src={logo.src} alt={`${name}, ${tagline.toLowerCase()}`} width={logo.width} height={logo.height} className="h-12 w-auto max-w-64 object-contain" />
          ) : (
            <p className="font-display text-3xl font-semibold">{name}</p>
          )}
          <p className="mt-4 max-w-sm text-ink-muted">
            Marque o seu horário pelo site ou fale connosco diretamente pelo WhatsApp.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          <li>
            <a
              data-track-whatsapp="footer"
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-3 font-semibold hover:text-accent"
            >
              <WhatsappLogoIcon size={22} aria-hidden="true" className="text-accent" />
              {formatPhoneForDisplay(whatsappNumber)}
            </a>
          </li>
          {instagramUrl && (
            <li>
              <a
                data-track-instagram="footer"
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-3 font-semibold hover:text-accent"
              >
                <InstagramLogoIcon size={22} aria-hidden="true" className="text-accent" />
                Instagram
              </a>
            </li>
          )}
          {address && (
            <li className="flex items-start gap-3">
              <MapPinIcon size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
              <span>{address}</span>
            </li>
          )}
          <li className="flex items-start gap-3">
            <ClockIcon size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
            <span>
              <span className="first-letter:uppercase inline-block">
                {formatOpeningDays(hours.days)}
              </span>
              {" · "}
              {hours.opens}–{hours.lastStart}
            </span>
          </li>
        </ul>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-ink-muted sm:px-6">
          <p>© {name} · {tagline}</p>
          <Link href="/admin" className="inline-flex min-h-11 items-center hover:text-accent">
            Área reservada
          </Link>
        </div>
      </div>
    </footer>
  );
}
