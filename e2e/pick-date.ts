import type { Locator } from "@playwright/test";

/** Picks a day in the booking calendar, moving on a month if it isn't showing yet. */
export async function pickDate(form: Locator, isoDate: string) {
  await form.getByRole("grid").waitFor();
  const day = form.locator(`[data-day="${isoDate}"] button`);
  if (!(await day.isVisible())) await form.getByRole("button", { name: "Ir para o próximo mês" }).click();
  await day.click();
}
