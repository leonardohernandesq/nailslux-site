"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheckIcon, ChartBarIcon, GearSixIcon, HandHeartIcon, ImageIcon } from "@phosphor-icons/react";

const LINKS = [
  { href: "/admin/marcacoes", label: "Marcações", icon: CalendarCheckIcon },
  { href: "/admin/servicos", label: "Serviços", icon: HandHeartIcon },
  { href: "/admin/portfolio", label: "Portfólio", icon: ImageIcon },
  { href: "/admin/estatisticas", label: "Estatísticas", icon: ChartBarIcon },
  { href: "/admin/definicoes", label: "Definições", icon: GearSixIcon },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel">
      {/* Phones: equal tabs with the icon above the label, so they always fit. */}
      <ul className="grid grid-cols-5 gap-1 sm:flex">
        {LINKS.map(({ href, label, icon: Icon }) => {
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
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
