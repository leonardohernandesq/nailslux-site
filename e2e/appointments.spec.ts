import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./constants";

/** A day well ahead, so this test's appointment doesn't affect the other specs. */
function dayAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const DATE = dayAhead(10);

async function visitor(browser: Browser) {
  const context = await browser.newContext();
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>WhatsApp stub</title>" }),
  );
  return { context, page: await context.newPage() };
}

async function openForm(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Escolher Verniz gel" }).click(); // 1 hour
  await page.getByRole("button", { name: "Agendar Agora" }).click();
  const form = page.getByRole("form", { name: "Pedido de marcação" });
  await form.getByLabel(/^Data/).fill(DATE);
  return form;
}

test("the studio confirms a request in the admin and the time is blocked", async ({ browser }) => {
  // 1. A client asks for 15:00. The WhatsApp message carries no links.
  const client = await visitor(browser);
  const form = await openForm(client.page);
  await form.getByText("15:00", { exact: true }).click();
  await form.getByLabel(/O seu nome/).fill("Joana Marcação");
  const popupPromise = client.page.waitForEvent("popup");
  await form.getByRole("button", { name: "Enviar pedido pelo WhatsApp" }).click();
  const popup = await popupPromise;
  await popup.waitForURL(/wa\.me/);
  expect(new URL(popup.url()).searchParams.get("text")).not.toContain("http");
  await client.context.close();

  // 2. The owner finds the request in Marcações and opens it.
  const owner = await browser.newPage();
  await owner.goto("/admin/login");
  await owner.locator("#email").fill(E2E_ADMIN.email);
  await owner.locator("#password").fill(E2E_ADMIN.password);
  await owner.getByRole("button", { name: "Entrar" }).click();
  await expect(owner).toHaveURL(/\/admin\/marcacoes$/);
  await owner.getByRole("link", { name: /Joana Marcação/ }).click();
  await expect(owner.getByRole("heading", { level: 1, name: "Joana Marcação" })).toBeVisible();
  await expect(owner.getByText("15:00–16:00")).toBeVisible();
  await expect(owner.getByRole("article").getByText("Por confirmar")).toBeVisible();

  await owner.getByRole("button", { name: "Confirmar marcação" }).click();
  await expect(owner.getByRole("status").filter({ hasText: "Marcação confirmada" })).toBeVisible();
  await expect(owner.getByRole("article").getByText("Confirmada", { exact: true })).toBeVisible();

  // 3. Another client can't pick 15:00, nor 14:30 (1h would run into 15:00).
  const next = await visitor(browser);
  const nextForm = await openForm(next.page);
  await expect(nextForm.getByRole("radio", { name: /15:00.*ocupado/ })).toBeDisabled();
  await expect(nextForm.getByRole("radio", { name: /14:30.*ocupado/ })).toBeDisabled();
  await expect(nextForm.getByRole("radio", { name: "16:00", exact: true })).toBeEnabled();
  await expect(nextForm.getByRole("radio", { name: "14:00", exact: true })).toBeEnabled();

  // 4. Cancelling frees the time again.
  await owner.getByRole("button", { name: "Cancelar marcação" }).click();
  await owner.getByRole("button", { name: "Sim, cancelar" }).click();
  await expect(owner.getByRole("status").filter({ hasText: "Marcação cancelada" })).toBeVisible();

  const later = await openForm(next.page);
  await expect(later.getByRole("radio", { name: "15:00", exact: true })).toBeEnabled();
  await next.context.close();
});

test("the bookings list shows pending requests", async ({ page }) => {
  await page.goto("/admin/login");
  await page.locator("#email").fill(E2E_ADMIN.email);
  await page.locator("#password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/marcacoes$/);
  await expect(page.getByRole("heading", { level: 1, name: "Marcações" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Por confirmar/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Marcações" })).toHaveAttribute("aria-current", "page");
});
