import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { sora } from "@/lib/fonts";
import { PLATFORM } from "@/lib/site";

/** The frame around sign-up and password pages. */
export function AuthShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className={`nailo flex min-h-dvh items-center justify-center px-4 py-12 ${sora.variable}`}>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" aria-label={`${PLATFORM.name}, início`}>
            <Image src="/brand/nailo/nailo-logo-horizontal.svg" alt="" width={463} height={146} priority unoptimized className="h-16 w-auto" />
          </Link>
          <h1 className="font-display mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-ink-muted">{intro}</p>
        </div>
        <div className="rounded-3xl bg-surface p-6 shadow-soft sm:p-8">{children}</div>
      </div>
    </main>
  );
}

export function FormMessage({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  const classes = tone === "error" ? "border-danger/25 bg-danger-soft text-danger" : "border-success/25 bg-success-soft text-success";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border p-4 text-sm font-semibold ${classes}`}>
      {children}
    </p>
  );
}
