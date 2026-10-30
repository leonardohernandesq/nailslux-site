import Image from "next/image";
import Link from "next/link";
import { SignOutIcon } from "@phosphor-icons/react/ssr";
import { platformLogout } from "@/lib/actions/platform";

// Every request reads the session, so navigations here are allowed to wait on the server.
export const instant = false;

export default function PlatformPanelLayout({ children }: LayoutProps<"/backoffice">) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <Link href="/backoffice" aria-label="Backoffice" className="-ml-3">
            <Image src="/brand/nailo/nailo-logo-horizontal.svg" alt="" width={463} height={146} unoptimized className="h-12 w-auto" />
          </Link>
          <form action={platformLogout}>
            <button
              type="submit"
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-muted hover:bg-danger-soft hover:text-danger"
            >
              <SignOutIcon size={18} aria-hidden="true" />
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
