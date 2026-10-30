/**
 * Creates the login for the /backoffice, or resets its password if it exists.
 * The password is read from the environment so it stays out of the shell history.
 *
 *   PLATFORM_PASSWORD="uma-frase-longa" npm run platform:create -- --email tu@exemplo.pt --name "O teu nome"
 *
 * Reads MONGODB_URI from .env.local / .env.
 */
import { config } from "dotenv";
import { parseArgs } from "node:util";
import bcrypt from "bcryptjs";
import { z } from "zod";

config({ path: [".env.local", ".env"], quiet: true });

const args = z
  .object({
    email: z.email("--email is missing or invalid").trim().toLowerCase(),
    name: z.string().trim().min(1).default("Admin"),
    password: z.string("PLATFORM_PASSWORD is missing").min(12, "PLATFORM_PASSWORD must have at least 12 characters"),
  })
  .safeParse({
    ...parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } }).values,
    password: process.env.PLATFORM_PASSWORD,
  });

if (!args.success) {
  console.error(["Could not create the login:", ...args.error.issues.map((issue) => `  • ${issue.message}`)].join("\n"));
  process.exit(1);
}

async function main() {
  // Imported after dotenv so MONGODB_URI is set.
  const { connectDB, disconnectDB } = await import("../lib/db/connect");
  const { User } = await import("../lib/db/models");
  const { email, name, password } = args.data!;

  await connectDB();
  const existing = await User.findOne({ email }, { role: 1 }).lean();
  if (existing && existing.role !== "platform") {
    throw new Error(`${email} belongs to a studio. Use a different email for the backoffice.`);
  }

  await User.updateOne(
    { email },
    { $set: { name, role: "platform", passwordHash: await bcrypt.hash(password, 12) } },
    { upsert: true },
  );
  console.log(`${existing ? "Updated" : "Created"} the backoffice login ${email}.`);
  await disconnectDB();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
