/**
 * Moves the existing NailsLux data onto the multi-tenant platform.
 *
 *   npm run tenants:migrate -- --whatsapp 351922269283 --instagram https://www.instagram.com/nailslux.design/
 *
 * Reads MONGODB_URI from .env.local / .env. Back up the database first: this writes
 * to every collection and replaces indexes.
 */
import { config } from "dotenv";
import { parseArgs } from "node:util";

config({ path: [".env.local", ".env"], quiet: true });

const { values } = parseArgs({
  options: {
    slug: { type: "string", default: "nailslux" },
    name: { type: "string", default: "NailsLux" },
    whatsapp: { type: "string" },
    instagram: { type: "string" },
    address: { type: "string" },
  },
});

async function main() {
  const whatsappNumber = (values.whatsapp ?? process.env.WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  if (!whatsappNumber) throw new Error("--whatsapp is missing.");

  // Imported after dotenv so MONGODB_URI is set.
  const { connectDB, disconnectDB } = await import("../lib/db/connect");
  const { migrateToTenants } = await import("../lib/db/migrate-tenants");

  await connectDB();
  const moved = await migrateToTenants({
    slug: values.slug,
    name: values.name,
    whatsappNumber,
    instagramUrl: values.instagram ?? process.env.INSTAGRAM_URL,
    address: values.address ?? process.env.STUDIO_ADDRESS,
  });
  console.log(`Tenant "${values.slug}" ready. Records moved:`, moved);
  await disconnectDB();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
