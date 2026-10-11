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
  await requireAdmin();
  const parsed = serviceFormSchema.safeParse(serviceFormDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formValues(formData));

  await connectDB();
  const last = await Service.findOne().sort({ order: -1 }).select("order").lean();
  const { price, ...rest } = parsed.data;
  await Service.create({ ...rest, priceCents: price, order: (last?.order ?? 0) + 1 });

  updateTag(CACHE_TAGS.services);
  redirect("/admin/servicos?saved=1");
}

export async function updateService(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
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

  const updated = await Service.findByIdAndUpdate(
    serviceId.data,
    Object.keys($unset).length > 0 ? { $set, $unset } : { $set },
  );
  if (!updated) return { status: "error", message: "Serviço não encontrado." };

  updateTag(CACHE_TAGS.services);
  redirect("/admin/servicos?saved=1");
}

export async function deleteService(id: string): Promise<void> {
  await requireAdmin();
  const serviceId = objectIdSchema.parse(id);
  await connectDB();
  await Service.findByIdAndDelete(serviceId);
  invalidate(CACHE_TAGS.services);
}

export async function setServiceActive(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  const serviceId = objectIdSchema.parse(id);
  await connectDB();
  await Service.findByIdAndUpdate(serviceId, { active });
  invalidate(CACHE_TAGS.services);
}

/** Swaps a service with its neighbour to change the order on the site. */
export async function moveService(id: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const serviceId = objectIdSchema.parse(id);
  await connectDB();

  const all = await Service.find().sort({ order: 1, createdAt: 1 }).select("_id").lean();
  const index = all.findIndex((doc) => String(doc._id) === serviceId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= all.length) return;

  [all[index], all[target]] = [all[target], all[index]];
  // Rewrite every position so legacy duplicates in `order` get normalised too.
  await Service.bulkWrite(
    all.map((doc, position) => ({
      updateOne: { filter: { _id: doc._id }, update: { $set: { order: position + 1 } } },
    })),
  );
  invalidate(CACHE_TAGS.services);
}
