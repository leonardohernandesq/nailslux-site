import { z } from "zod";

const priceInput = z
  .string({ error: "Indique o preço." })
  .trim()
  .min(1, { error: "Indique o preço." })
  .regex(/^\d{1,4}([.,]\d{1,2})?$/, {
    error: "Use um valor como 25 ou 25,50.",
  })
  .transform((value) => Math.round(Number.parseFloat(value.replace(",", ".")) * 100));

const durationInput = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Number(value) : undefined))
  .pipe(
    z
      .number({ error: "Indique a duração em minutos." })
      .int({ error: "Use minutos inteiros." })
      .min(5, { error: "Mínimo de 5 minutos." })
      .max(480, { error: "Máximo de 480 minutos." })
      .optional(),
  );

/** Parses the admin service form (all values arrive as strings from FormData). */
export const serviceFormSchema = z.object({
  name: z
    .string({ error: "Indique o nome." })
    .trim()
    .min(2, { error: "O nome precisa de pelo menos 2 caracteres." })
    .max(80, { error: "Máximo de 80 caracteres." }),
  description: z
    .string()
    .trim()
    .max(300, { error: "Máximo de 300 caracteres." })
    .optional()
    .transform((value) => value || undefined),
  price: priceInput,
  durationMinutes: durationInput,
  active: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true"),
});

export type ServiceFormInput = z.input<typeof serviceFormSchema>;
export type ServiceFormData = z.output<typeof serviceFormSchema>;

export function serviceFormDataToObject(formData: FormData) {
  return {
    name: formData.get("name") ?? undefined,
    description: formData.get("description") ?? undefined,
    price: formData.get("price") ?? undefined,
    durationMinutes: formData.get("durationMinutes") ?? undefined,
    active: formData.get("active") ?? undefined,
  };
}

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, { error: "Identificador inválido." });
