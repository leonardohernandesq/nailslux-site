"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loginSchema } from "../validation/auth";
import { validationError, type FormState } from "./form-state";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") ?? "" });
  // Never echo the password back.
  if (!parsed.success) return validationError(parsed.error, { email });

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeAdminPath(formData.get("callbackUrl")) });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "Email ou palavra-passe incorretos.",
        values: { email },
      };
    }
    throw error; // includes the success redirect
  }
  return { status: "success" };
}

/**
 * Where to go after logging in: the admin page the user was trying to open (e.g.
 * a booking link), or the bookings list. Only same-site /admin paths are allowed,
 * so the login can't be used to redirect anywhere else.
 */
function safeAdminPath(value: FormDataEntryValue | null): string {
  const fallback = "/admin/marcacoes";
  if (typeof value !== "string" || !value) return fallback;
  try {
    const url = new URL(value, "http://local");
    const path = url.pathname + url.search;
    return url.pathname.startsWith("/admin/") && !url.pathname.startsWith("/admin/login") ? path : fallback;
  } catch {
    return fallback;
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
