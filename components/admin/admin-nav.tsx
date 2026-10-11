"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HandHeartIcon, ImageIcon } from "@phosphor-icons/react";

const LINKS = [
  { href: "/admin/servicos", label: "Serviços", icon: HandHeartIcon },
  { href: "/admin/portfolio", label: "Portfólio", icon: ImageIcon },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel">
      <ul className="flex gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold transition-colors ${
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
