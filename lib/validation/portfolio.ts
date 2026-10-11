import { z } from "zod";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "../constants";

const maxMb = MAX_UPLOAD_BYTES / (1024 * 1024);

export const imageFileSchema = z
  .instanceof(File, { error: "Escolha uma fotografia." })
  .refine((file) => file.size > 0, { error: "Escolha uma fotografia." })
  .refine((file) => file.size <= MAX_UPLOAD_BYTES, {
    error: `A fotografia tem de ter no máximo ${maxMb} MB.`,
  })
  .refine((file) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type), {
    error: "Formato não suportado. Use JPG, PNG, WebP ou AVIF.",
  });

export const captionSchema = z
  .string()
  .trim()
  .max(120, { error: "Máximo de 120 caracteres." })
  .optional()
  .transform((value) => value || undefined);

export const portfolioUploadSchema = z.object({
  file: imageFileSchema,
  caption: captionSchema,
});
