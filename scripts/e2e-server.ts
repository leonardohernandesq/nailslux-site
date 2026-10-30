/**
 * Starts a throwaway MongoDB, seeds it, and runs the Next.js dev server against it.
 * Used by Playwright (see playwright.config.ts) so e2e tests never touch real data.
 */
import { spawn } from "node:child_process";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import { E2E_ADMIN, E2E_INSTAGRAM, E2E_PLATFORM, E2E_SLUG, E2E_WHATSAPP } from "../e2e/constants";

const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);

async function main() {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri("nailslux-e2e");
  process.env.MONGODB_URI = uri;

  const { connectDB, disconnectDB } = await import("../lib/db/connect");
  const { Service, Tenant, User } = await import("../lib/db/models");
  await connectDB();
  const tenant = await Tenant.create({
    slug: E2E_SLUG,
    name: "NailsLux",
    whatsappNumber: E2E_WHATSAPP,
    instagramUrl: E2E_INSTAGRAM,
  });
  const tenantId = tenant._id;
  await User.create({
    tenantId,
    name: E2E_ADMIN.name,
    email: E2E_ADMIN.email,
    passwordHash: await bcrypt.hash(E2E_ADMIN.password, 4),
  });
  await User.create({
    role: "platform",
    name: E2E_PLATFORM.name,
    email: E2E_PLATFORM.email,
    passwordHash: await bcrypt.hash(E2E_PLATFORM.password, 4),
  });
  await Service.create([
    { tenantId, name: "Verniz gel", description: "Cor e brilho que duram semanas.", priceCents: 2500, durationMinutes: 60, order: 1 },
    { tenantId, name: "Pedicure", priceCents: 1800, durationMinutes: 45, order: 2 },
    { tenantId, name: "Serviço escondido", priceCents: 999, active: false, order: 3 },
  ]);
  await disconnectDB();

  const next = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--port", String(E2E_PORT)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        MONGODB_URI: uri,
        AUTH_SECRET: "e2e-only-secret-not-for-production-000000",
        REGISTRATION_OPEN: "true",
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  );

  const shutdown = async () => {
    next.kill();
    await mongo.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  next.on("exit", async (code) => {
    await mongo.stop();
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
