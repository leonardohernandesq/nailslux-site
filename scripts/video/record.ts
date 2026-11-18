/**
 * Records the promo video from the real app, paced by the narration, and builds
 * the final MP4s (1080x1920, H.264 + AAC):
 *
 *   1. npx tsx scripts/video/demo-server.ts            (keep it running)
 *   2. python scripts/video/narrate.py                 (video-out/<lang>/*.mp3)
 *   3. FFMPEG=<path to ffmpeg> npx tsx scripts/video/record.ts [pt|br]
 *
 * Output: video-out/nailo-app-<lang>.mp4
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const BASE = `http://localhost:${process.env.DEMO_PORT ?? 3200}`;
const ADMIN = { email: "ana@nailslux.demo", password: "demo-password-123" };
const OUT = path.resolve("video-out");
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
/** Space after each line of narration before the next scene starts. */
const GAP_MS = 650;
/** Narration starts this long into its scene. */
const LEAD_MS = 250;

type Lang = "pt" | "br";
type Scene = { id: string; caption: Record<Lang, string>; say: Record<Lang, string> };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Day `offset` days ahead that the studio is open (every day in the demo). */
const isoDay = (offset: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date(Date.now() + offset * 86_400_000));

/**
 * Runs in every page: the caption pill, the title card and a ripple where the
 * finger taps. Their state lives in sessionStorage, so it survives navigations.
 */
function overlay() {
  const css = `
    #v-caption{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483647;max-width:calc(100% - 28px);
      padding:10px 18px;border-radius:999px;background:rgba(15,24,48,.92);color:#fff;font:700 17px/1.25 Quicksand,system-ui,sans-serif;
      text-align:center;box-shadow:0 10px 30px rgba(15,24,48,.35);transition:opacity .35s, transform .35s;pointer-events:none}
    #v-caption[data-hidden]{opacity:0;transform:translate(-50%,-8px)}
    #v-card{position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;
      background:radial-gradient(120% 70% at 85% 0%,rgba(201,63,42,.45),transparent 60%),radial-gradient(90% 60% at 0% 100%,rgba(217,185,138,.28),transparent 60%),#0f1830;
      color:#fff;text-align:center;padding:32px;transition:opacity .6s;pointer-events:none}
    #v-card[data-hidden]{opacity:0}
    #v-card img{width:260px;height:auto}
    #v-card p{margin:0;font:700 26px/1.25 Quicksand,system-ui,sans-serif;max-width:340px}
    #v-card small{font:600 17px/1.3 Quicksand,system-ui,sans-serif;color:#d9b98a}
    .v-tap{position:fixed;z-index:2147483647;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
      background:rgba(201,63,42,.35);border:2px solid rgba(201,63,42,.9);pointer-events:none;animation:v-tap .55s ease-out forwards}
    @keyframes v-tap{from{transform:scale(.4);opacity:1}to{transform:scale(1.4);opacity:0}}
    html{scrollbar-width:none} nextjs-portal{display:none!important}`;
  const render = () => {
    if (!document.body) return;
    if (!document.getElementById("v-style")) {
      const style = document.createElement("style");
      style.id = "v-style";
      style.textContent = css;
      document.head.append(style);
    }
    let caption = document.getElementById("v-caption");
    if (!caption) {
      caption = document.createElement("div");
      caption.id = "v-caption";
      document.body.append(caption);
    }
    const text = sessionStorage.getItem("v-caption") ?? "";
    caption.textContent = text;
    caption.toggleAttribute("data-hidden", !text);

    let card = document.getElementById("v-card");
    const cardState = sessionStorage.getItem("v-card");
    if (!card) {
      card = document.createElement("div");
      card.id = "v-card";
      card.setAttribute("data-hidden", "");
      document.body.append(card);
    }
    if (cardState) {
      const { title, note } = JSON.parse(cardState) as { title: string; note?: string };
      card.innerHTML = `<img src="/brand/nailo/nailo-logo-horizontal-negativo.svg" alt=""><p></p>${note ? "<small></small>" : ""}`;
      card.querySelector("p")!.textContent = title;
      if (note) card.querySelector("small")!.textContent = note;
      card.removeAttribute("data-hidden");
    } else {
      card.setAttribute("data-hidden", "");
    }
  };
  (window as unknown as { __vRender: () => void }).__vRender = render;
  document.addEventListener("DOMContentLoaded", render);
  addEventListener("pointerdown", (event) => {
    const dot = document.createElement("div");
    dot.className = "v-tap";
    dot.style.left = `${event.clientX}px`;
    dot.style.top = `${event.clientY}px`;
    document.body.append(dot);
    setTimeout(() => dot.remove(), 600);
  });
  // The booking form opens WhatsApp in a new tab; the video stays on the site.
  window.open = () => ({ opener: null, location: { href: "" }, close() {} }) as unknown as Window;
}

async function setCaption(page: Page, text: string) {
  await page.evaluate((value) => {
    sessionStorage.setItem("v-caption", value);
    (window as unknown as { __vRender: () => void }).__vRender();
  }, text);
}

async function setCard(page: Page, card: { title: string; note?: string } | null) {
  await page.evaluate((value) => {
    if (value) sessionStorage.setItem("v-card", JSON.stringify(value));
    else sessionStorage.removeItem("v-card");
    (window as unknown as { __vRender: () => void }).__vRender();
  }, card);
}

/** Scrolls the page smoothly by `distance` pixels over `ms`. */
async function glide(page: Page, distance: number, ms = 1600) {
  await page.evaluate(
    ({ distance, ms }) =>
      new Promise<void>((resolve) => {
        const start = scrollY;
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / ms);
          const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
          scrollTo(0, start + distance * eased);
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      }),
    { distance, ms },
  );
}

/** Scrolls smoothly until `selector` sits near the top, under the caption. */
async function glideTo(page: Page, selector: string, ms = 1600, offset = 70) {
  const top = await page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().top);
  await glide(page, top - offset, ms);
}

/** Opens a page and waits until it has painted its content, not a loading state. */
async function go(page: Page, url: string) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.locator("h1").first().waitFor({ state: "visible" });
  // Images in view, at most 3 s: lazy ones further down only load when scrolled to.
  await page.evaluate(() =>
    Promise.race([
      Promise.all([...document.images].filter((img) => !img.complete && img.loading !== "lazy").map((img) => new Promise((done) => img.addEventListener("load", done, { once: true })))),
      new Promise((done) => setTimeout(done, 3000)),
    ]),
  );
}

/** What happens on screen in each scene, in order. */
const ACTIONS: Record<string, (page: Page, lang: Lang) => Promise<void>> = {
  async intro(page, lang) {
    await setCard(page, { title: lang === "pt" ? "O seu studio, organizado" : "Seu studio, organizado" });
    await sleep(3400);
    await setCard(page, null);
    await sleep(600);
    await glide(page, 420, 1800);
  },
  async site(page) {
    await go(page, "/nailslux");
    await sleep(900);
    await glideTo(page, "#servicos", 1600);
    await sleep(500);
    await glideTo(page, "#portfolio", 1700);
  },
  async book(page) {
    await glideTo(page, "#servicos", 1000);
    await page.getByRole("button", { name: /^Escolher Gelinho \(Verniz Gel\) - Mão/ }).click();
    await sleep(900);
    await page.getByRole("dialog").getByRole("button", { name: "Agendar Agora" }).click();
    await sleep(900);
    const form = page.getByRole("form", { name: "Pedido de marcação" });
    await form.getByRole("checkbox", { name: /Blindagem de Unhas - Pé/ }).check();
    await sleep(600);
    await form.getByRole("grid").scrollIntoViewIfNeeded();
    await glide(page, -40, 400);
    const day = form.locator(`[data-day="${isoDay(6)}"] button`);
    if (!(await day.isVisible())) await form.getByRole("button", { name: "Ir para o próximo mês" }).click();
    await day.click();
    await sleep(700);
    await form.getByText("11:00", { exact: true }).scrollIntoViewIfNeeded();
    await form.getByText("11:00", { exact: true }).click();
  },
  async send(page) {
    const form = page.getByRole("form", { name: "Pedido de marcação" });
    const name = form.getByLabel(/O seu nome/);
    await name.scrollIntoViewIfNeeded();
    await name.pressSequentially("Marta Silva", { delay: 70 });
    await form.getByLabel(/O seu WhatsApp/).pressSequentially("912345678", { delay: 70 });
    await sleep(300);
    const submit = form.getByRole("button", { name: "Enviar pedido pelo WhatsApp" });
    await submit.scrollIntoViewIfNeeded();
    await submit.click();
    await page.getByRole("status").filter({ hasText: "Mensagem pronta" }).waitFor();
    await page.getByRole("status").filter({ hasText: "Mensagem pronta" }).scrollIntoViewIfNeeded();
  },
  async requests(page) {
    await go(page, "/admin/marcacoes");
    await sleep(1300);
    // The request Marta just sent, at the top of the list.
    await page.getByRole("link", { name: /Marta Silva/ }).first().click();
    await page.waitForURL(/\/admin\/marcacoes\/.+/);
    await page.waitForLoadState("networkidle");
    await sleep(900);
    await page.getByRole("button", { name: "Confirmar marcação" }).click();
    await sleep(700);
    await page.getByRole("button", { name: "Sim, confirmar" }).click();
    await page.getByRole("status").first().waitFor();
    await sleep(1200);
  },
  async clients(page) {
    await go(page, "/admin/clientes");
    await sleep(1200);
    await page.getByRole("link", { name: /Beatriz Almeida/ }).first().click();
    await page.waitForURL(/\/admin\/clientes\/.+/);
    await page.waitForLoadState("networkidle");
    await sleep(900);
    await glide(page, 420, 1800);
  },
  async content(page) {
    await go(page, "/admin/servicos");
    await sleep(800);
    await glide(page, 380, 1300);
    await go(page, "/admin/portfolio");
    await sleep(600);
    await glide(page, 300, 1100);
  },
  async stats(page) {
    await go(page, "/admin/estatisticas");
    await sleep(1500);
    await glide(page, 520, 1800);
    await sleep(400);
    await glide(page, 620, 1800);
  },
  async settings(page) {
    await go(page, "/admin/definicoes");
    await sleep(900);
    await glide(page, 600, 1700);
    await sleep(300);
    await glide(page, 1500, 2200);
  },
  async referral(page) {
    await go(page, "/admin/subscricao");
    await sleep(600);
    await glideTo(page, "#referral-title", 1400);
  },
  async outro(page, lang) {
    await setCaption(page, "");
    await setCard(page, {
      title: lang === "pt" ? "Crie o seu site hoje" : "Crie seu site hoje",
      note: lang === "pt" ? "Desde 4,90 € por mês" : "A partir de R$ 19,90 por mês",
    });
  },
};

async function record(lang: Lang) {
  const script = JSON.parse(await readFile("scripts/video/script.json", "utf8")) as { scenes: Scene[] };
  const durations = JSON.parse(await readFile(path.join(OUT, "durations.json"), "utf8")) as Record<Lang, Record<string, number>>;
  const raw = path.join(OUT, `raw-${lang}`);
  await rm(raw, { recursive: true, force: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 432, height: 768 },
    deviceScaleFactor: 2.5,
    isMobile: true,
    hasTouch: true,
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
    // The landing shows reais to visitors from Brazil.
    extraHTTPHeaders: lang === "br" ? { "x-vercel-ip-country": "BR" } : {},
    recordVideo: { dir: raw, size: { width: 1080, height: 1920 } },
  });
  // tsx wraps named functions in __name(), which the page doesn't have.
  await context.addInitScript({ content: `window.__name = (target) => target; (${overlay.toString()})();` });

  // Signs in off camera: this page's video is thrown away.
  const login = await context.newPage();
  await login.goto(`${BASE}/admin/login`);
  await login.locator("#email").fill(ADMIN.email);
  await login.locator("#password").fill(ADMIN.password);
  await login.getByRole("button", { name: "Entrar" }).click();
  await login.waitForURL(/\/admin\/marcacoes/);
  // Warm every page up, so the dev server has compiled them before recording.
  for (const url of ["/", "/nailslux", "/admin/marcacoes", "/admin/clientes", "/admin/servicos", "/admin/portfolio", "/admin/estatisticas", "/admin/definicoes", "/admin/subscricao"]) {
    await login.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  }
  await login.close();
  const loginVideo = await login.video()?.path();

  const page = await context.newPage();
  const opened = Date.now();
  await go(page, "/");
  await setCard(page, { title: lang === "pt" ? "O seu studio, organizado" : "Seu studio, organizado" });
  await sleep(500);

  const starts: number[] = [];
  const begin = Date.now();
  for (const scene of script.scenes) {
    const t0 = Date.now();
    starts.push(t0 - begin);
    if (scene.id !== "intro" && scene.id !== "outro") await setCaption(page, scene.caption[lang]);
    try {
      await ACTIONS[scene.id](page, lang);
    } catch (error) {
      await page.screenshot({ path: path.join(OUT, `failed-${lang}-${scene.id}.png`) });
      throw error;
    }
    const length = durations[lang][scene.id] * 1000 + LEAD_MS + GAP_MS;
    const left = length - (Date.now() - t0);
    if (left > 0) await sleep(left);
    else console.warn(`${scene.id}: the actions took ${-left} ms longer than the narration.`);
  }
  await sleep(1500); // the end card stays a moment after the last line
  const total = Date.now() - begin;

  const video = page.video()!;
  await page.close();
  await context.close();
  await browser.close();
  if (loginVideo) await rm(loginVideo, { force: true });
  const webm = await video.path();
  const timing = { webm, offset: (begin - opened) / 1000, total: total / 1000, starts };
  await writeFile(path.join(OUT, `timing-${lang}.json`), JSON.stringify(timing, null, 2));
  console.log(`Recorded ${lang}: ${timing.total.toFixed(1)} s`);
  await mux(lang, script.scenes, timing);
}

/** Puts the recording and the narration together into the final MP4. */
async function mux(lang: Lang, scenes: Scene[], { webm, offset, total, starts }: { webm: string; offset: number; total: number; starts: number[] }) {

  // Narration: each scene's line, placed where the scene starts.
  const inputs = scenes.flatMap((scene) => ["-i", path.join(OUT, lang, `${scene.id}.mp3`)]);
  const delays = scenes.map((_, i) => `[${i + 1}:a]adelay=${starts[i] + LEAD_MS}|${starts[i] + LEAD_MS}[a${i}]`).join(";");
  const mix = `${scenes.map((_, i) => `[a${i}]`).join("")}amix=inputs=${scenes.length}:normalize=0[voice]`;
  const output = path.join(OUT, `nailo-app-${lang}.mp4`);
  execFileSync(
    FFMPEG,
    [
      "-y",
      "-ss", offset.toFixed(2),
      "-t", total.toFixed(2),
      "-i", webm,
      ...inputs,
      "-filter_complex", `${delays};${mix}`,
      "-map", "0:v",
      "-map", "[voice]",
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "160k",
      // Social apps expect 48 kHz stereo; the voices come as 24 kHz mono.
      "-ar", "48000",
      "-ac", "2",
      "-movflags", "+faststart",
      "-t", total.toFixed(2),
      output,
    ],
    { stdio: "inherit" },
  );
  console.log(`Wrote ${output}`);
}

async function main() {
  const langs = (process.argv[2] ? [process.argv[2]] : ["pt", "br"]) as Lang[];
  await mkdir(OUT, { recursive: true });
  // --mux rebuilds the MP4 from the last recording, without recording again.
  if (process.argv.includes("--mux")) {
    const { scenes } = JSON.parse(await readFile("scripts/video/script.json", "utf8")) as { scenes: Scene[] };
    for (const lang of langs) await mux(lang, scenes, JSON.parse(await readFile(path.join(OUT, `timing-${lang}.json`), "utf8")));
    return;
  }
  for (const lang of langs) await record(lang);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
