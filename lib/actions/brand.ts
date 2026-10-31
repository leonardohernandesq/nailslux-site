"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { requireStudioEditor } from "../auth/studio-access";
import { CACHE_TAGS, LOGO_MAX_EDGE } from "../constants";
import { connectDB } from "../db/connect";
import { deleteImage, processIcon, processImage, saveImage } from "../db/images";
import { Tenant } from "../db/models";
import { brandColorsSchema, brandImageSchema } from "../validation/brand";
import { formValues, validationError, type FormState } from "./form-state";

const imageKind = z.enum(["logo", "banner"]);

function refreshSite(tenantSlug: string) {
  updateTag(CACHE_TAGS.tenant(tenantSlug));
  refresh();
}

export async function updateBrandColors(_prev: FormState, formData: FormData): Promise<FormState> {
  const { tenantId, tenantSlug } = await requireStudioEditor(formData.get("studioId"));
  const values = formValues(formData);
  const parsed = brandColorsSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  await connectDB();
  await Tenant.updateOne({ _id: tenantId }, parsed.data);
  refreshSite(tenantSlug);
  return { status: "success", message: "Cores guardadas." };
}

export async function resetBrandColors(formData: FormData): Promise<void> {
  const { tenantId, tenantSlug } = await requireStudioEditor(formData.get("studioId"));
  await connectDB();
  await Tenant.updateOne({ _id: tenantId }, { $unset: { primaryColor: 1, secondaryColor: 1 } });
  refreshSite(tenantSlug);
}

/** Stores the new image first, so a failure leaves the site with the one it had. */
export async function uploadBrandImage(kind: "logo" | "banner", formData: FormData): Promise<FormState> {
  const { tenantId, tenantSlug } = await requireStudioEditor(formData.get("studioId"));
  const target = imageKind.parse(kind);
  const file = brandImageSchema.safeParse(formData.get("file"));
  if (!file.success) return { status: "error", message: file.error.issues[0]?.message ?? "Imagem inválida." };

  const input = Buffer.from(await file.data.arrayBuffer());
  let image, icon;
  try {
    image = target === "logo" ? await processImage(input, LOGO_MAX_EDGE) : await processImage(input);
    icon = target === "logo" ? await processIcon(input) : undefined;
  } catch {
    return { status: "error", message: "Não foi possível ler esta imagem. Tente outra." };
  }

  await connectDB();
  const fileId = await saveImage(image.buffer, file.data.name);
  const { width, height, blurDataUrl } = image;
  let value;
  if (icon) {
    value = { fileId, iconFileId: await saveImage(icon, "icon.png", "image/png"), width, height };
  } else {
    value = { fileId, width, height, blurDataUrl };
  }

  const before = await Tenant.findOneAndUpdate({ _id: tenantId }, { [target]: value }).lean();
  await deleteBrandFiles(before?.[target]);
  refreshSite(tenantSlug);
  return { status: "success", message: target === "logo" ? "Logo guardado." : "Banner guardado." };
}

export async function removeBrandImage(kind: "logo" | "banner", studioId?: string): Promise<void> {
  const { tenantId, tenantSlug } = await requireStudioEditor(studioId);
  const target = imageKind.parse(kind);

  await connectDB();
  const before = await Tenant.findOneAndUpdate({ _id: tenantId }, { $unset: { [target]: 1 } }).lean();
  await deleteBrandFiles(before?.[target]);
  refreshSite(tenantSlug);
}

async function deleteBrandFiles(previous?: { fileId?: unknown; iconFileId?: unknown } | null) {
  for (const id of [previous?.fileId, previous?.iconFileId]) {
    if (id) await deleteImage(id as Parameters<typeof deleteImage>[0]);
  }
}
