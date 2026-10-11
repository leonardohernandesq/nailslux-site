import type { NextAuthConfig } from "next-auth";

// Edge-safe part of the Auth.js config (no DB, no bcrypt). Used by proxy.ts for
// the optimistic redirect; auth.ts adds the Credentials provider on top.
export const authConfig = {
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const loggedIn = Boolean(auth?.user);
      if (pathname === "/admin/login") {
        return loggedIn ? Response.redirect(new URL("/admin", request.nextUrl)) : true;
      }
      if (pathname.startsWith("/admin")) return loggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
