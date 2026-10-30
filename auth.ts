import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { connectDB } from "./lib/db/connect";
import { Tenant, User } from "./lib/db/models";
import { loginSchema } from "./lib/validation/auth";

// Compared against when the email doesn't exist, so response time doesn't reveal
// which emails are registered.
// (Hash of a random string nobody knows.)
const DUMMY_HASH = "$2b$12$ox6Ml.qfMXDG5V/4GQBH6.sxwJTTsveSM4BohpvdnpkyzokYU/2EO";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Palavra-passe", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        await connectDB();
        const user = await User.findOne({ email: parsed.data.email }).select("+passwordHash").lean();
        const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) return null;

        const tenant = await Tenant.findById(user.tenantId, { slug: 1 }).lean();
        if (!tenant) return null;

        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          tenantId: String(tenant._id),
          tenantSlug: tenant.slug,
        };
      },
    }),
  ],
});
