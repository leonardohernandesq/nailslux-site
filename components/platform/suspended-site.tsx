import Image from "next/image";
import { sora } from "@/lib/fonts";
import { PLATFORM } from "@/lib/site";

/** Shown at a studio's address while its site is suspended. */
export function SuspendedSite() {
  return (
    <main className={`nailo flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-center ${sora.variable}`}>
      <Image src="/brand/nailo/nailo-logo-horizontal.svg" alt={PLATFORM.name} width={463} height={146} priority unoptimized className="h-16 w-auto" />
      <h1 className="font-display mt-6 text-2xl font-bold tracking-tight sm:text-3xl">Site suspenso</h1>
      <p className="mt-2 text-ink-muted">Por favor, entre em contacto com o administrador.</p>
    </main>
  );
}
