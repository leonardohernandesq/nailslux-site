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
    await signIn("credentials", { ...parsed.data, redirectTo: "/admin/servicos" });
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

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
