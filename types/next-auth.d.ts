import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    tenantId?: string;
    tenantSlug?: string;
  }
  interface Session {
    user: { id: string; tenantId?: string; tenantSlug?: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    tenantId?: string;
    tenantSlug?: string;
  }
}
