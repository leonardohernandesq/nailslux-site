import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type AdminUser = { id: string; name: string; email: string; tenantId: string; tenantSlug: string };

/**
 * Returns the signed-in studio owner, or redirects to the login page. `tenantId`
 * here is the only source of "which studio" for admin code: never take it from
 * the request.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email || !user.tenantId || !user.tenantSlug) redirect("/admin/login");
  return {
    id: user.id,
    name: user.name ?? "Admin",
    email: user.email,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
  };
}
