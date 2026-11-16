"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AddressBookIcon, CalendarCheckIcon, ChartBarIcon, GearSixIcon, HandHeartIcon, ImageIcon } from "@phosphor-icons/react";

// `short` is what fits under the icon on phones, where six tabs share the width.
const LINKS = [
  { href: "/admin/marcacoes", label: "Marcações", short: "Agenda", icon: CalendarCheckIcon },
  { href: "/admin/clientes", label: "Clientes", short: "Clientes", icon: AddressBookIcon },
  { href: "/admin/servicos", label: "Serviços", short: "Serviços", icon: HandHeartIcon },
  { href: "/admin/portfolio", label: "Portfólio", short: "Fotos", icon: ImageIcon },
  { href: "/admin/estatisticas", label: "Estatísticas", short: "Números", icon: ChartBarIcon },
  { href: "/admin/definicoes", label: "Definições", short: "Ajustes", icon: GearSixIcon },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel">
      {/* Below lg: six equal tabs, icon above the label, so they always fit.
          From lg: one row of pills next to the logo. */}
      <ul className="grid grid-cols-6 gap-1 lg:flex lg:justify-center lg:gap-0.5">
        {LINKS.map(({ href, label, short, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1 text-[0.65rem] font-semibold whitespace-nowrap transition-colors sm:text-xs lg:min-h-10 lg:flex-row lg:gap-1 lg:rounded-full lg:px-2 lg:py-0 lg:text-sm xl:gap-1.5 xl:px-3 ${
                  active ? "bg-ink text-cream" : "text-ink-muted hover:bg-peach-50 hover:text-ink"
                }`}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} aria-hidden="true" className="shrink-0" />
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
