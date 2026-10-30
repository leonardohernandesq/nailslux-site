import { expect, test } from "@playwright/test";

test("a new studio signs up and lands in its own panel, with a private site", async ({ page }) => {
  await page.goto("/registo?plano=anual");
  await expect(page.getByRole("radio", { name: /Anual/ })).toBeChecked();
  await page.getByLabel("Nome do studio").fill("Unhas da Inês");
  await expect(page.getByLabel("Endereço do site")).toHaveValue("unhas-da-ines");
  await page.getByLabel("WhatsApp do studio").fill("912 345 678");
  await page.getByLabel("O seu nome").fill("Inês");
  await page.getByLabel("Email").fill("ines@e2e.test");
  await page.getByLabel("Palavra-passe").fill("uma-frase-longa");
  await page.getByLabel(/Aceito os/).check();
  await page.getByRole("button", { name: "Continuar para o pagamento" }).click();

  await expect(page).toHaveURL(/\/admin\/definicoes\?novo=1/);
  await expect(page.getByText("O seu site ainda não está público")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nome do studio" })).toHaveValue("Unhas da Inês");

  await page.goto("/admin/subscricao");
  await page.getByRole("button", { name: "Ativar subscrição" }).click();
  await expect(page.getByText("Os pagamentos ainda não estão disponíveis")).toBeVisible();

  // The new studio sees nothing of the existing one.
  await page.goto("/admin/servicos");
  await expect(page.getByText("Verniz gel")).toHaveCount(0);

  await page.goto("/unhas-da-ines");
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText("Unhas impecáveis");
});
