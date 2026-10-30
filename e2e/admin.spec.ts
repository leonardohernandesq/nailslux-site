import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./constants";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.locator("#email").fill(E2E_ADMIN.email);
  await page.locator("#password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/marcacoes/);
}

test("admin pages require login", async ({ page }) => {
  await page.goto("/admin/servicos");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "Área reservada" })).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/admin/login");
  await page.locator("#email").fill(E2E_ADMIN.email);
  await page.locator("#password").fill("not-the-password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Email ou palavra-passe incorretos.")).toBeVisible();
  await expect(page.locator("#email")).toHaveValue(E2E_ADMIN.email);
});

test("admin creates, edits and deletes a service; changes show on the site", async ({ page }) => {
  await login(page);
  await expect(page.getByText(`Olá, Ana!`)).toBeVisible();
  await page.getByRole("link", { name: "Serviços" }).click();

  // Validation errors keep what was typed
  await page.getByRole("link", { name: "Novo serviço" }).click();
  await page.locator("#name").fill("Manicure russa");
  await page.locator("#price").fill("abc");
  await page.getByRole("button", { name: "Guardar serviço" }).click();
  await expect(page.getByText("Use um valor como 25 ou 25,50.")).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("Manicure russa");

  await page.locator("#price").fill("32,50");
  await page.locator("#durationMinutes").fill("75");
  await page.getByRole("button", { name: "Guardar serviço" }).click();
  await expect(page.getByRole("status")).toContainText("Serviço guardado");
  await expect(page.getByRole("heading", { name: "Manicure russa" })).toBeVisible();

  await page.goto("/nailslux");
  const card = page.locator("#servicos li").filter({ hasText: "Manicure russa" });
  await expect(card).toContainText("32,50");
  await expect(card).toContainText("1h15");

  // Edit
  await page.goto("/admin/servicos");
  await page.getByRole("link", { name: "Editar Manicure russa" }).click();
  await page.locator("#price").fill("35");
  await page.getByRole("button", { name: "Guardar serviço" }).click();
  await expect(page.getByRole("status")).toContainText("Serviço guardado");
  await page.goto("/nailslux");
  await expect(page.locator("#servicos li").filter({ hasText: "Manicure russa" })).toContainText("35,00");

  // Delete (with confirmation)
  await page.goto("/admin/servicos");
  await page.getByRole("button", { name: "Apagar Manicure russa" }).click();
  const dialog = page.getByRole("dialog", { name: "Apagar Manicure russa?" });
  await dialog.getByRole("button", { name: "Apagar" }).click();
  await expect(page.getByRole("heading", { name: "Manicure russa" })).toHaveCount(0);
  await page.goto("/nailslux");
  await expect(page.locator("#servicos")).not.toContainText("Manicure russa");
});

test("admin uploads a portfolio photo and it shows on the site", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Portfólio" }).click();
  await expect(page.getByRole("heading", { name: "Portfólio", level: 1 })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "nails.png"));
  await expect(page.getByText("1 de 1 enviadas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "1 fotografia" })).toBeVisible();

  await page.getByRole("textbox", { name: "Legenda" }).fill("Gel laranja");
  await page.getByRole("button", { name: "Guardar legenda" }).click();
  await expect(page.getByText("Legenda guardada.")).toBeVisible();

  await page.goto("/nailslux");
  const gallery = page.locator("#portfolio");
  await expect(gallery.getByText("Gel laranja")).toBeVisible();
  const img = gallery.locator("img").first();
  // Gallery images are lazy-loaded: scroll to them, then wait for the real pixels.
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);

  // Lightbox opens and closes
  await gallery.getByRole("button", { name: /Ampliar fotografia/ }).click();
  await expect(page.getByRole("dialog", { name: "Fotografia ampliada" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Delete
  await page.goto("/admin/portfolio");
  await page.getByRole("button", { name: "Apagar fotografia 1" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Apagar" }).click();
  await expect(page.getByText("Ainda não há fotografias")).toBeVisible();
});

test("logout ends the session", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin/servicos");
  await expect(page).toHaveURL(/\/admin\/login/);
});
