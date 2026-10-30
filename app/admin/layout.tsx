import type { Metadata } from "next";
import { sora } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Área reservada",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  // The panel is the platform's product, so it wears Nailo, not any one studio's brand.
  return <div className={`nailo min-h-dvh ${sora.variable}`}>{children}</div>;
}
