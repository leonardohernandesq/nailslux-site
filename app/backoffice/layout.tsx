import type { Metadata } from "next";
import { sora } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Backoffice",
  robots: { index: false, follow: false },
};

export default function BackofficeRootLayout({ children }: LayoutProps<"/backoffice">) {
  return <div className={`nailo min-h-dvh ${sora.variable}`}>{children}</div>;
}
