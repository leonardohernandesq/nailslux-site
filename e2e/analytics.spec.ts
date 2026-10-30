import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./constants";

/** Next Monday–Saturday at least one day ahead, as YYYY-MM-DD. */
function nextOpenDay(): string {
  const d = new Date();
  do d.setDate(d.getDate() + 1);
  while (d.getDay() === 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const analyticsEvent = (page: Page, type: string) =>
  page.waitForResponse(
    (r) => r.url().endsWith("/api/analytics") && (r.request().postData() ?? "").includes(`"type":"${type}"`),
  );

test("visits, WhatsApp clicks and booking requests show up in the statistics", async ({ browser }) => {
  // A visitor (no session) browses, clicks WhatsApp and sends a booking request.
  const visitor = await browser.newContext();
  for (const url of ["https://wa.me/**", "https://www.instagram.com/**"]) {
    await visitor.route(url, (route) => route.fulfill({ contentType: "text/html", body: "<title>Stub</title>" }));
  }
  const site = await visitor.newPage();

  const pageview = analyticsEvent(site, "pageview");
  await site.goto("/nailslux");
  expect((await pageview).status()).toBe(204);

  const click = analyticsEvent(site, "whatsapp_click");
  const popup = site.waitForEvent("popup");
  await site.locator("[data-track-whatsapp='hero']").click();
  await (await popup).close();
  expect((await click).status()).toBe(204);

  const instagram = analyticsEvent(site, "instagram_click");
  const instagramPopup = site.waitForEvent("popup");
  await site.locator("[data-track-instagram='portfolio']").click();
  await (await instagramPopup).close();
  expect((await instagram).status()).toBe(204);

  await site.getByRole("button", { name: "Escolher Verniz gel" }).click();
  await site.getByRole("button", { name: "Agendar Agora" }).click();
  const form = site.getByRole("form", { name: "Pedido de marcação" });
  await form.getByLabel(/^Data/).fill(nextOpenDay());
  await form.getByText("10:30", { exact: true }).click();
  await form.getByLabel(/O seu nome/).fill("Maria Teste");
  await form.getByLabel(/O seu WhatsApp/).fill("912 345 678");
  const booking = analyticsEvent(site, "booking");
  const bookingPopup = site.waitForEvent("popup");
  await form.getByRole("button", { name: "Enviar pedido pelo WhatsApp" }).click();
  await (await bookingPopup).close();
  expect((await booking).status()).toBe(204);
  await visitor.close();

  // The owner sees it in the dashboard.
  const owner = await browser.newPage();
  await owner.goto("/admin/login");
  await owner.locator("#email").fill(E2E_ADMIN.email);
  await owner.locator("#password").fill(E2E_ADMIN.password);
  await owner.getByRole("button", { name: "Entrar" }).click();
  await expect(owner).toHaveURL(/\/admin\/marcacoes/);

  await owner.getByRole("link", { name: "Estatísticas" }).click();
  await expect(owner.getByRole("heading", { level: 1, name: "Estatísticas" })).toBeVisible();
  await expect(owner.getByRole("link", { name: "30 dias" })).toHaveAttribute("aria-current", "page");

  const visitors = owner.getByRole("listitem").filter({ hasText: "Visitantes" });
  await expect(visitors.locator("p").nth(1)).not.toHaveText("0");
  await expect(owner.getByRole("listitem").filter({ hasText: "Taxa de conversão" })).toContainText("%");

  await expect(owner.getByRole("listitem").filter({ hasText: "Cliques no Instagram" }).locator("p").nth(1)).not.toHaveText(
    "0",
  );
  // Each chart has a screen-reader table with the same numbers.
  await expect(owner.getByRole("table", { name: "Serviços mais pedidos" }).getByRole("row", { name: /Verniz gel/ })).toBeAttached();
  const links = owner.getByRole("table", { name: "Cliques nos links" });
  await expect(links.getByRole("row", { name: /WhatsApp · topo/ })).toBeAttached();
  await expect(links.getByRole("row", { name: /Instagram · portfólio/ })).toBeAttached();
  // The visual chart is drawn too.
  await expect(owner.locator(".recharts-surface").first()).toBeVisible();
  await expect(owner.getByRole("table", { name: "Horas mais procuradas" }).getByRole("row", { name: /^10h/ })).toContainText(
    /[1-9]/,
  );

  await owner.getByRole("link", { name: "7 dias" }).click();
  await expect(owner).toHaveURL(/periodo=7/);
  await expect(owner.getByText("Últimos 7 dias.")).toBeVisible();
});
