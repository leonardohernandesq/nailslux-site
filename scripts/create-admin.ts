/**
 * Creates a studio's admin login, or resets its password if the email already exists.
 *
 *   npm run admin:create -- --tenant nailslux --email ana@exemplo.pt --name "Ana" --password "uma-frase-longa"
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
    tenant: z.string("--tenant is missing").trim().toLowerCase().min(1),
    email: z.email("--email is missing or invalid").trim().toLowerCase(),
    name: z.string().trim().min(1).default("Admin"),
    password: z
      .string("--password is missing")
      .min(10, "--password must have at least 10 characters"),
  })
  .safeParse(
    parseArgs({
      options: { tenant: { type: "string" }, email: { type: "string" }, name: { type: "string" }, password: { type: "string" } },
    }).values,
  );

if (!args.success) {
  console.error(
    [
      "Could not create the admin:",
      ...args.error.issues.map((issue) => `  • ${issue.message}`),
      "",
      "Usage:",
      '  npm run admin:create -- --tenant nailslux --email "you@example.com" --name "Your Name" --password "at-least-10-chars"',
    ].join("\n"),
  );
  process.exit(1);
}

async function main() {
  // Imported after dotenv so MONGODB_URI is set.
  const { connectDB, disconnectDB } = await import("../lib/db/connect");
  const { Tenant, User } = await import("../lib/db/models");
  const { tenant: slug, email, name, password } = args.data!;

  await connectDB();
  const tenant = await Tenant.findOne({ slug }, { _id: 1 }).lean();
  if (!tenant) throw new Error(`No studio with the slug "${slug}".`);

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOneAndUpdate(
    { email },
    { $set: { name, passwordHash, tenantId: tenant._id } },
    { upsert: true, new: false },
  );
  console.log(existing ? `Updated admin ${email}.` : `Created admin ${email}.`);
  await disconnectDB();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
