import { expect, test } from "@playwright/test";
import { E2E_SLUG } from "./constants";

test("the landing page presents the platform and leads to a real studio", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A sua agenda");

  await page.locator("#painel").scrollIntoViewIfNeeded();
  await page.getByRole("tab", { name: "Estatísticas" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Pedidos por dia da semana");

  await page.locator("#exemplo a").click();
  await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}$`));
});

test("the menu leads to the plans, and a plan to sign-up with it chosen", async ({ page }) => {
  await page.goto("/");
  await page.locator('header a[href="#preco"]:visible').click();

  const pricing = page.locator("#preco");
  await expect(pricing).toContainText("9,99");
  await expect(pricing).toContainText("99,99");

  await pricing.getByRole("link", { name: /plano Anual/ }).click();
  await expect(page).toHaveURL(/\/registo\?plano=anual$/);
  await expect(page.getByRole("radio", { name: /Anual/ })).toBeChecked();
});

test("with reduced motion the hero shows one clean screen", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");

  const phone = page.getByRole("img", { name: /Demonstração/ });
  await expect(phone.getByText("Escolha o serviço")).toBeVisible();
  await expect(phone.getByText("Pedido enviado")).toBeHidden();
  await context.close();
});
