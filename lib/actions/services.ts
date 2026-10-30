"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../auth/dal";
import { CACHE_TAGS } from "../constants";
import { connectDB } from "../db/connect";
import { Service } from "../db/models";
import { objectIdSchema, serviceFormDataToObject, serviceFormSchema } from "../validation/service";
import { formValues, validationError, type FormState } from "./form-state";
import { invalidate } from "./invalidate";

export async function createService(_prev: FormState, formData: FormData): Promise<FormState> {
  const { tenantId } = await requireAdmin();
  const parsed = serviceFormSchema.safeParse(serviceFormDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formValues(formData));

  await connectDB();
  const last = await Service.findOne({ tenantId }).sort({ order: -1 }).select("order").lean();
  const { price, ...rest } = parsed.data;
  await Service.create({ ...rest, tenantId, priceCents: price, order: (last?.order ?? 0) + 1 });

  updateTag(CACHE_TAGS.services(tenantId));
  redirect("/admin/servicos?saved=1");
}

export async function updateService(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenantId } = await requireAdmin();
  const serviceId = objectIdSchema.safeParse(id);
  if (!serviceId.success) return { status: "error", message: "Serviço não encontrado." };
  const parsed = serviceFormSchema.safeParse(serviceFormDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formValues(formData));

  await connectDB();
  const { price, description, durationMinutes, ...rest } = parsed.data;
  const $set: Record<string, unknown> = { ...rest, priceCents: price };
  const $unset: Record<string, 1> = {};
  // Clearing an optional field in the form removes it from the document.
  if (description === undefined) $unset.description = 1;
  else $set.description = description;
  if (durationMinutes === undefined) $unset.durationMinutes = 1;
  else $set.durationMinutes = durationMinutes;

  const updated = await Service.findOneAndUpdate(
    { _id: serviceId.data, tenantId },
    Object.keys($unset).length > 0 ? { $set, $unset } : { $set },
  );
  if (!updated) return { status: "error", message: "Serviço não encontrado." };

  updateTag(CACHE_TAGS.services(tenantId));
  redirect("/admin/servicos?saved=1");
}

export async function deleteService(id: string): Promise<void> {
  const { tenantId } = await requireAdmin();
  const serviceId = objectIdSchema.parse(id);
  await connectDB();
  await Service.findOneAndDelete({ _id: serviceId, tenantId });
  invalidate(CACHE_TAGS.services(tenantId));
}

export async function setServiceActive(id: string, active: boolean): Promise<void> {
  const { tenantId } = await requireAdmin();
  const serviceId = objectIdSchema.parse(id);
  await connectDB();
  await Service.findOneAndUpdate({ _id: serviceId, tenantId }, { active });
  invalidate(CACHE_TAGS.services(tenantId));
}

/** Swaps a service with its neighbour to change the order on the site. */
export async function moveService(id: string, direction: "up" | "down"): Promise<void> {
  const { tenantId } = await requireAdmin();
  const serviceId = objectIdSchema.parse(id);
  await connectDB();

  const all = await Service.find({ tenantId }).sort({ order: 1, createdAt: 1 }).select("_id").lean();
  const index = all.findIndex((doc) => String(doc._id) === serviceId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= all.length) return;

  [all[index], all[target]] = [all[target], all[index]];
  // Rewrite every position so legacy duplicates in `order` get normalised too.
  await Service.bulkWrite(
    all.map((doc, position) => ({
      updateOne: { filter: { _id: doc._id, tenantId }, update: { $set: { order: position + 1 } } },
    })),
  );
  invalidate(CACHE_TAGS.services(tenantId));
}
