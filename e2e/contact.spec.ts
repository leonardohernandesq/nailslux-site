import { expect, test } from "@playwright/test";

test("a studio sends a suggestion from the contact page", async ({ page }) => {
  await page.goto("/");
  await page.locator('footer a[href="/contacto"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fale connosco");

  // Sugestão comes picked; the others are one tap away.
  await expect(page.getByRole("radio", { name: "Sugestão" })).toBeChecked();
  await page.getByText("Agradecimento").click();
  await expect(page.getByRole("radio", { name: "Agradecimento" })).toBeChecked();

  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Corrija os campos assinalados");

  await page.getByLabel("O seu nome").fill("Inês");
  await page.getByLabel("Email").fill("ines@example.com");
  await page.getByLabel("Nome ou endereço do seu studio").fill("unhas-da-ines");
  await page.getByLabel("Mensagem").fill("Adorei o site, as clientes marcam sozinhas.");
  // The chosen kind survives the failed attempt.
  await expect(page.getByRole("radio", { name: "Agradecimento" })).toBeChecked();
  await page.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(page.getByRole("main").getByRole("status")).toContainText("Mensagem enviada");
});
