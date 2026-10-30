import Link from "next/link";
import { PLATFORM } from "@/lib/site";

// Placeholder until the institutional site is built.
export default function PlatformHome() {
  return (
    <main className="bg-glow flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-5xl font-semibold">{PLATFORM.name}</h1>
      <p className="mt-3 max-w-md text-ink-muted">{PLATFORM.description}</p>
      <Link href="/admin" className="mt-6 inline-flex min-h-11 items-center font-semibold text-accent hover:underline">
        Entrar
      </Link>
    </main>
  );
}
