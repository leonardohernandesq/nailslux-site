import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";

export type AdminUser = { id: string; name: string; email: string; tenantId: string; tenantSlug: string };

/** Returns the signed-in platform admin, or redirects to the backoffice login. */
export async function requirePlatformAdmin(): Promise<{ id: string; name: string; email: string }> {
  await connection();
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email || !user.platformAdmin) redirect("/backoffice/login");
  return { id: user.id, name: user.name ?? "Admin", email: user.email };
}

/**
 * Returns the signed-in studio owner, or redirects to the login page. `tenantId`
 * here is the only source of "which studio" for admin code: never take it from
 * the request. The one exception, for platform admins, is `requireStudioEditor`.
 */
export async function requireAdmin(): Promise<AdminUser> {
  await connection(); // sessions are per request, so never part of a prerender
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
