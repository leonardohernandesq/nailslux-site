import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Optimistic check only: reads the session cookie and redirects anonymous visitors
// away from /admin. Every admin page and Server Action verifies the session again
// (see lib/auth/dal.ts).
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*"],
};
