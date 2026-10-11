import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .email({ error: "Indique um email válido." })
    .trim()
    .toLowerCase(),
  password: z
    .string({ error: "Indique a palavra-passe." })
    .min(1, { error: "Indique a palavra-passe." })
    .max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
