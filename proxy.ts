import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Optimistic check only: reads the session cookie and redirects visitors away from
// /admin and /backoffice. Every page and Server Action there verifies the session
// again (see lib/auth/dal.ts).
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*", "/backoffice/:path*"],
};
