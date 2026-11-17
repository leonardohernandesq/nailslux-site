import { z } from "zod";
import { loginSchema } from "./auth";

/** What the message is about, as the radio buttons on /contacto offer it. */
export const CONTACT_KINDS = [
  { value: "sugestao", label: "Sugestão" },
  { value: "reclamacao", label: "Reclamação" },
  { value: "observacao", label: "Observação" },
  { value: "agradecimento", label: "Agradecimento" },
] as const;

export type ContactKind = (typeof CONTACT_KINDS)[number]["value"];

const kinds = CONTACT_KINDS.map((kind) => kind.value) as [ContactKind, ...ContactKind[]];

export const contactSchema = z.object({
  kind: z.enum(kinds, { error: "Escolha o tipo de mensagem." }),
  name: z.string().trim().min(2, { error: "Indique o seu nome." }).max(80, { error: "Máximo de 80 caracteres." }),
  email: loginSchema.shape.email,
  site: z
    .string()
    .trim()
    .max(120, { error: "Máximo de 120 caracteres." })
    .transform((value) => value || undefined),
  message: z
    .string()
    .trim()
    .min(10, { error: "Escreva pelo menos 10 caracteres." })
    .max(3000, { error: "Máximo de 3000 caracteres." }),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const contactKindLabel = (kind: ContactKind) => CONTACT_KINDS.find((k) => k.value === kind)?.label ?? kind;
