import type { Model } from "mongoose";
import { AnalyticsEvent, Appointment, Client, PortfolioItem, Service, Tenant, User } from "./models";

export type FirstTenant = {
  slug: string;
  name: string;
  whatsappNumber: string;
  instagramUrl?: string;
  address?: string;
};

// Typed loosely because each model has its own document type.
const TENANT_OWNED: Model<never>[] = [
  Service,
  PortfolioItem,
  User,
  AnalyticsEvent,
  Appointment,
  Client,
] as unknown as Model<never>[];

/**
 * Moves a single-studio database onto the platform: creates the studio's tenant,
 * hands it every record that has no tenant yet, then replaces the old indexes (the
 * old unique index on Client.phone would block two studios sharing a client).
 *
 * Safe to run again, and worth running once more after the deploy: requests served
 * by the old code in between are saved without a tenant.
 */
export async function migrateToTenants(first: FirstTenant): Promise<Record<string, number>> {
  const tenant = await Tenant.findOneAndUpdate(
    { slug: first.slug },
    { $setOnInsert: first },
    { upsert: true, returnDocument: "after" },
  ).lean();
  if (!tenant) throw new Error("Could not create the tenant.");

  const moved: Record<string, number> = {};
  for (const model of TENANT_OWNED) {
    // `.collection` on purpose: this is the one job that spans tenants.
    const { modifiedCount } = await model.collection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: tenant._id } },
    );
    moved[model.modelName] = modifiedCount;
    await model.syncIndexes();
  }
  await Tenant.syncIndexes();
  return moved;
}
