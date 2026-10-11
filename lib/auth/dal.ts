import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type AdminUser = { id: string; name: string; email: string };

/** Returns the signed-in admin, or redirects to the login page. */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) redirect("/admin/login");
  return { id: user.id, name: user.name ?? "Admin", email: user.email };
}
