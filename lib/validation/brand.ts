import { z } from "zod";
import { HEX_COLOR_PATTERN } from "../brand-colors";
import { ACCEPTED_IMAGE_TYPES, BRAND_MAX_UPLOAD_BYTES } from "../constants";

const colorSchema = z.string().regex(HEX_COLOR_PATTERN, { error: "Escolha uma cor." });

export const brandColorsSchema = z.object({ primaryColor: colorSchema, secondaryColor: colorSchema });

export const BRAND_FILE_TOO_BIG = `A imagem tem de ter no máximo ${BRAND_MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`;

export const brandImageSchema = z
  .instanceof(File, { error: "Escolha uma imagem." })
  .refine((file) => file.size > 0, { error: "Escolha uma imagem." })
  .refine((file) => file.size <= BRAND_MAX_UPLOAD_BYTES, { error: BRAND_FILE_TOO_BIG })
  .refine((file) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type), {
    error: "Formato não suportado. Use JPG, PNG, WebP ou AVIF.",
  });
