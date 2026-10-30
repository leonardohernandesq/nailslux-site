import { expect, test } from "@playwright/test";
import { E2E_WHATSAPP } from "./constants";

/** Next Monday–Saturday at least one day ahead, as YYYY-MM-DD. */
function nextOpenDay(): string {
  const d = new Date();
  do d.setDate(d.getDate() + 1);
  while (d.getDay() === 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test.beforeEach(async ({ context }) => {
  // Never hit the real WhatsApp; answer wa.me with a stub page.
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>WhatsApp stub</title>" }),
  );
});

test("home page lists only visible services", async ({ page }) => {
  await page.goto("/nailslux");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Unhas impecáveis");

  const services = page.locator("#servicos");
  await expect(services.getByRole("heading", { name: "Verniz gel" })).toBeVisible();
  await expect(services.getByRole("heading", { name: "Pedicure" })).toBeVisible();
  await expect(page.getByText("Serviço escondido")).toHaveCount(0);
});

test("picking a service asks to book; continuing keeps the visitor on the services", async ({ page }) => {
  await page.goto("/nailslux");

  const pick = page.getByRole("button", { name: "Escolher Verniz gel" });
  await pick.click();
  const dialog = page.getByRole("dialog", { name: "Deseja agendar o seu horário agora?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Verniz gel foi adicionado");
  await expect(dialog.getByRole("button", { name: "Agendar Agora" })).toBeFocused();

  await dialog.getByRole("button", { name: "Continuar Selecionando" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Escolhido Verniz gel" })).toBeFocused();
  await expect(page.locator("#servicos")).toBeInViewport();

  // Removing a service doesn't ask; adding another one does, and Esc also dismisses.
  await page.getByRole("button", { name: "Escolhido Verniz gel" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Escolher Pedicure" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Escolhido Pedicure" })).toBeVisible();
});

test("client books through WhatsApp", async ({ page }) => {
  await page.goto("/nailslux");

  await page.getByRole("button", { name: "Escolher Verniz gel" }).click();
  const dialog = page.getByRole("dialog", { name: "Deseja agendar o seu horário agora?" });
  await dialog.getByRole("button", { name: "Agendar Agora" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Marque o seu horário" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Marque o seu horário" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Escolhido Verniz gel" })).toHaveCount(1);

  const form = page.getByRole("form", { name: "Pedido de marcação" });
  await expect(form.getByRole("checkbox", { name: /Verniz gel/ })).toBeChecked();
  await form.getByRole("checkbox", { name: /Pedicure/ }).check();
  await expect(form.getByText(/43,00/)).toBeVisible();

  const date = nextOpenDay();
  await form.getByLabel(/^Data/).fill(date);
  await form.getByText("10:30", { exact: true }).click();
  await form.getByLabel(/O seu nome/).fill("Maria Teste");
  await form.getByLabel(/O seu WhatsApp/).fill("912 345 678");
  await form.getByLabel(/Observações/).fill("Tons nude, por favor");

  const popupPromise = page.waitForEvent("popup");
  await form.getByRole("button", { name: "Enviar pedido pelo WhatsApp" }).click();
  const popup = await popupPromise;
  // The tab opens blank on click and moves to WhatsApp once the request is saved.
  await popup.waitForURL(/wa\.me/);

  const url = new URL(popup.url());
  expect(url.host).toBe("wa.me");
  expect(url.pathname).toBe(`/${E2E_WHATSAPP}`);
  const text = url.searchParams.get("text") ?? "";
  expect(text).toContain("*Nome:* Maria Teste");
  expect(text).toContain("Verniz gel");
  expect(text).toContain("Pedicure");
  expect(text).toContain("*Hora:* 10:30");
  expect(text).toContain("*Observações:* Tons nude, por favor");
  await expect(page.getByRole("status").filter({ hasText: "Mensagem pronta" })).toBeVisible();
});

test("empty booking shows a focused error summary", async ({ page }) => {
  await page.goto("/nailslux#marcar");
  await page.getByRole("button", { name: "Enviar pedido pelo WhatsApp" }).click();

  const summary = page.getByRole("alert").filter({ hasText: "Reveja estes campos" });
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("Escolha pelo menos um serviço");
  await expect(summary).toContainText("Indique o seu nome");
});
