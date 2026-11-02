import { z } from "zod";
import { DAY_NAMES, type Weekday } from "../site";
import { RESERVED_SLUGS, TENANT_SLUG_PATTERN } from "../constants";
import { normalizePhone } from "../phone";
import { loginSchema } from "./auth";

/** "Unhas da Inês" -> "unhas-da-ines" */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

export const passwordSchema = z
  .string({ error: "Escolha uma palavra-passe." })
  .min(10, { error: "Use pelo menos 10 caracteres." })
  .max(200, { error: "Máximo de 200 caracteres." });

const whatsappSchema = z
  .string()
  .trim()
  .min(1, { error: "Indique o número de WhatsApp." })
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Indique um número válido, ex.: 912 345 678." });
      return z.NEVER;
    }
    return phone;
  });

const studioNameSchema = z
  .string()
  .trim()
  .min(2, { error: "Indique o nome do studio." })
  .max(80, { error: "Máximo de 80 caracteres." });

export const registerSchema = z.object({
  studioName: studioNameSchema,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((slug) => TENANT_SLUG_PATTERN.test(slug), {
      error: "Use só letras minúsculas, números e hífenes.",
    })
    .refine((slug) => !RESERVED_SLUGS.includes(slug), { error: "Este endereço não está disponível." }),
  whatsappNumber: whatsappSchema,
  ownerName: z
    .string()
    .trim()
    .min(2, { error: "Indique o seu nome." })
    .max(80, { error: "Máximo de 80 caracteres." }),
  email: loginSchema.shape.email,
  password: passwordSchema,
  terms: z.literal("on", { error: "Aceite os termos para continuar." }),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo de ${max} caracteres.` })
    .transform((value) => value || undefined);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

const dayHoursSchema = z
  .object({ day: z.custom<Weekday>(), opens: z.string(), lastStart: z.string() })
  .superRefine(({ day, opens, lastStart }, ctx) => {
    const name = capitalize(DAY_NAMES[day]);
    if (!TIME_PATTERN.test(opens) || !TIME_PATTERN.test(lastStart)) {
      ctx.addIssue({ code: "custom", message: `${name}: escolha as horas.` });
    } else if (opens >= lastStart) {
      ctx.addIssue({ code: "custom", message: `${name}: a última marcação tem de ser depois da primeira.` });
    }
  });

export const settingsSchema = z.object({
  name: studioNameSchema,
  tagline: z.string().trim().min(2, { error: "Indique uma frase curta." }).max(80, { error: "Máximo de 80 caracteres." }),
  whatsappNumber: whatsappSchema,
  // Rendered as a link, so only https is accepted.
  instagramUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https:\/\/([\w-]+\.)?instagram\.com\//.test(value), {
      error: "Cole o link completo, ex.: https://www.instagram.com/o.seu.studio/",
    })
    .transform((value) => value || undefined),
  address: optionalText(200),
  days: z.array(dayHoursSchema).min(1, { error: "Escolha pelo menos um dia." }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
