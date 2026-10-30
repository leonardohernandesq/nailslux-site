"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "../auth/dal";
import { CACHE_TAGS } from "../constants";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import { settingsSchema } from "../validation/registration";
import { formValues, validationError, type FormState } from "./form-state";

export async function updateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { tenantId, tenantSlug } = await requireAdmin();
  const values = formValues(formData);
  const parsed = settingsSchema.safeParse({ ...values, days: formData.getAll("days") });
  if (!parsed.success) return validationError(parsed.error, values);

  const { days, opens, lastStart, instagramUrl, address, ...rest } = parsed.data;
  const $set: Record<string, unknown> = { ...rest, "hours.days": days, "hours.opens": opens, "hours.lastStart": lastStart };
  const $unset: Record<string, 1> = {};
  // Clearing an optional field in the form removes it from the document.
  if (instagramUrl) $set.instagramUrl = instagramUrl;
  else $unset.instagramUrl = 1;
  if (address) $set.address = address;
  else $unset.address = 1;

  await connectDB();
  await Tenant.updateOne({ _id: tenantId }, { $set, $unset });

  updateTag(CACHE_TAGS.tenant(tenantSlug));
  refresh();
  return { status: "success", message: "Definições guardadas." };
}
