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
      {/* Phones: equal tabs with the icon above the label, so they always fit. */}
      <ul className="grid grid-cols-6 gap-1 sm:flex">
        {LINKS.map(({ href, label, short, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[0.68rem] font-semibold transition-colors sm:inline-flex sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-0 sm:text-base ${
                  active ? "bg-ink text-cream" : "text-ink-muted hover:bg-peach-50 hover:text-ink"
                }`}
              >
                <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden="true" />
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
