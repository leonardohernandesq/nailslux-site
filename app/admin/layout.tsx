import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Área reservada",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
