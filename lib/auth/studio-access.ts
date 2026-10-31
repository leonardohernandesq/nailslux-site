import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import { requireAdmin, requirePlatformAdmin } from "./dal";

/**
 * Which studio a settings action may change. Without `studioId` it's the signed-in
 * owner's own. Naming a studio comes from the browser, so it takes a platform admin:
 * an owner who sends another studio's id is turned away here, never reaching it.
 */
export async function requireStudioEditor(studioId?: unknown): Promise<{ tenantId: string; tenantSlug: string }> {
  if (studioId === undefined || studioId === null) {
    const { tenantId, tenantSlug } = await requireAdmin();
    return { tenantId, tenantSlug };
  }

  await requirePlatformAdmin();
  if (typeof studioId !== "string" || !isValidObjectId(studioId)) throw new Error("Unknown studio.");
  await connectDB();
  const tenant = await Tenant.findById(studioId, { slug: 1 }).lean();
  if (!tenant) throw new Error("Unknown studio.");
  return { tenantId: studioId, tenantSlug: tenant.slug };
}
