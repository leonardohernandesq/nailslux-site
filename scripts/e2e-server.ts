/**
 * Starts a throwaway MongoDB, seeds it, and runs the Next.js dev server against it.
 * Used by Playwright (see playwright.config.ts) so e2e tests never touch real data.
 */
import { spawn } from "node:child_process";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import { E2E_ADMIN, E2E_INSTAGRAM, E2E_WHATSAPP } from "../e2e/constants";

const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);

async function main() {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri("nailslux-e2e");
  process.env.MONGODB_URI = uri;

  const { connectDB, disconnectDB } = await import("../lib/db/connect");
  const { Service, User } = await import("../lib/db/models");
  await connectDB();
  await User.create({
    name: E2E_ADMIN.name,
    email: E2E_ADMIN.email,
    passwordHash: await bcrypt.hash(E2E_ADMIN.password, 4),
  });
  await Service.create([
    { name: "Verniz gel", description: "Cor e brilho que duram semanas.", priceCents: 2500, durationMinutes: 60, order: 1 },
    { name: "Pedicure", priceCents: 1800, durationMinutes: 45, order: 2 },
    { name: "Serviço escondido", priceCents: 999, active: false, order: 3 },
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
        WHATSAPP_NUMBER: E2E_WHATSAPP,
        INSTAGRAM_URL: E2E_INSTAGRAM,
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
