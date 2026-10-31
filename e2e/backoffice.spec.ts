import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN, E2E_PLATFORM, E2E_SLUG } from "./constants";

async function login(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto("/backoffice/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("the backoffice requires its own login", async ({ page }) => {
  await page.goto("/backoffice");
  await expect(page).toHaveURL(/\/backoffice\/login/);

  await login(page, E2E_ADMIN);
  await expect(page.getByText("Email ou palavra-passe incorretos.")).toBeVisible();
});

test("the platform admin sees the studios and can suspend and reactivate one", async ({ page, context }) => {
  await login(page, E2E_PLATFORM);
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();

  const row = page.getByRole("listitem").filter({ hasText: E2E_ADMIN.email });
  await expect(row).toContainText("Online");
  await expect(row).toContainText("Faturação direta");

  await row.getByRole("button", { name: "Suspender" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Suspender" }).click();
  await expect(row).toContainText("Suspenso");

  const visitor = await context.newPage();
  await visitor.goto(`/${E2E_SLUG}`);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Site suspenso");
  await expect(visitor.getByText("Por favor, entre em contacto com o administrador.")).toBeVisible();
  await expect(visitor.getByRole("img", { name: "Nailo App" })).toBeVisible();
  await visitor.close();

  await row.getByRole("button", { name: "Reativar" }).click();
  await expect(row).toContainText("Online");

  const back = await context.newPage();
  await back.goto(`/${E2E_SLUG}`);
  await expect(back.getByRole("heading", { level: 1 })).toContainText("Unhas impecáveis");
  await back.close();

  // Editing a studio on the owner's behalf reaches its data.
  await page.getByRole("link", { name: /^Editar / }).first().waitFor();
  await row.getByRole("link", { name: /^Editar / }).click();
  const tagline = page.getByLabel("Frase curta");
  const original = await tagline.inputValue();
  await tagline.fill("Frase do backoffice");
  await page.getByRole("button", { name: "Guardar definições" }).click();
  await expect(page.getByText("Definições guardadas.")).toBeVisible();
  await page.reload();
  await expect(tagline).toHaveValue("Frase do backoffice");
  await tagline.fill(original);
  await page.getByRole("button", { name: "Guardar definições" }).click();
  await expect(page.getByText("Definições guardadas.")).toBeVisible();

  // The platform login has no studio, so a studio panel sends it home.
  await page.goto("/admin/marcacoes");
  await expect(page).toHaveURL(/\/backoffice$/);
});
