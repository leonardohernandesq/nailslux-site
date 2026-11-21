/**
 * Renders Instagram posts (standalone 1080x1350 HTML pages) to JPEGs in public/social/,
 * served at https://www.nailoapp.pt/social/<name>.jpg once deployed.
 *
 *   node scripts/render-social.mjs social/src/2026-11-21-indicacao.html [output-name]
 *   node scripts/render-social.mjs --stale
 *
 * --stale renders every social/src/*.html that has no .jpg yet, or whose .html changed
 * after its .jpg (by last commit time, so it works on a fresh CI checkout; uncommitted
 * changes count as newest). It prints the rendered names, one per line, on stdout.
 *
 * During the capture public/ is served on a local static server and the page is opened
 * from it, so absolute paths such as /brand/nailo/... resolve without production.
 * Google Fonts and other https URLs still load from the network.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const SRC = path.join(ROOT, "social", "src");
const OUT = path.join(PUBLIC, "social");
const MAX_BYTES = 8 * 1024 * 1024;
const NAME = /^[a-z0-9][a-z0-9-]*$/i;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

/** Serves public/ at /, and the post being rendered at /__post.html. */
function startServer() {
  let current = "";
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let file;
    if (url.pathname === "/__post.html") {
      file = current;
    } else {
      file = path.join(PUBLIC, decodeURIComponent(url.pathname));
      if (!file.startsWith(PUBLIC + path.sep)) file = "";
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () =>
      resolve({
        origin: `http://127.0.0.1:${server.address().port}`,
        setPost: (file) => (current = file),
        close: () => new Promise((done) => server.close(done)),
      }),
    ),
  );
}

async function render(page, server, html, name) {
  server.setPost(html);
  const failed = [];
  const onFail = (req) => failed.push(req.url());
  const onResponse = (res) => res.status() >= 400 && failed.push(`${res.url()} (${res.status()})`);
  page.on("requestfailed", onFail);
  page.on("response", onResponse);
  try {
    await page.goto(`${server.origin}/__post.html`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    const problems = await page.evaluate(async () => {
      const imgs = [...document.images];
      await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
      return [
        ...imgs.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => `image not loaded: ${img.src}`),
        ...[...document.fonts].filter((f) => f.status === "error").map((f) => `font failed: ${f.family}`),
      ];
    });
    if (failed.length) problems.push(...failed.map((u) => `request failed: ${u}`));
    if (problems.length) throw new Error(problems.join("\n  "));

    const out = path.join(OUT, `${name}.jpg`);
    await page.screenshot({ path: out, type: "jpeg", quality: 90, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
    const { size } = await stat(out);
    if (size > MAX_BYTES) throw new Error(`${name}.jpg is ${(size / 1048576).toFixed(1)} MB, over the 8 MB limit`);
    console.error(`rendered public/social/${name}.jpg (${Math.round(size / 1024)} KB)`);
  } finally {
    page.off("requestfailed", onFail);
    page.off("response", onResponse);
  }
}

/** Last commit time of a file, or Infinity when it is untracked or has uncommitted changes. */
function commitTime(file) {
  const rel = path.relative(ROOT, file);
  try {
    const dirty = execFileSync("git", ["status", "--porcelain", "--", rel], { cwd: ROOT, encoding: "utf8" }).trim();
    if (dirty) return Infinity;
    const t = execFileSync("git", ["log", "-1", "--format=%ct", "--", rel], { cwd: ROOT, encoding: "utf8" }).trim();
    return t ? Number(t) : Infinity;
  } catch {
    return Infinity;
  }
}

async function staleJobs() {
  const files = existsSync(SRC) ? (await readdir(SRC)).filter((f) => f.endsWith(".html")).sort() : [];
  const jobs = [];
  for (const f of files) {
    const name = f.slice(0, -5);
    if (!NAME.test(name)) throw new Error(`Bad file name social/src/${f}: use only letters, digits and hyphens.`);
    const html = path.join(SRC, f);
    const jpg = path.join(OUT, `${name}.jpg`);
    if (!existsSync(jpg) || commitTime(html) > commitTime(jpg)) jobs.push({ html, name });
  }
  return jobs;
}

const args = process.argv.slice(2);
let jobs;
if (args[0] === "--stale") {
  jobs = await staleJobs();
} else if (args[0]) {
  const html = path.resolve(args[0]);
  const name = (args[1] ?? path.basename(html, ".html")).replace(/\.jpe?g$/i, "");
  if (!existsSync(html)) throw new Error(`Not found: ${args[0]}`);
  if (!NAME.test(name)) throw new Error("Output name must use only letters, digits and hyphens.");
  jobs = [{ html, name }];
} else {
  console.error("Usage: node scripts/render-social.mjs <post.html> [output-name] | --stale");
  process.exit(1);
}

if (!jobs.length) {
  console.error("Nothing to render.");
  process.exit(0);
}

const server = await startServer();
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const job of jobs) {
    try {
      await render(page, server, job.html, job.name);
      console.log(job.name);
    } catch (err) {
      errors.push(`${path.relative(ROOT, job.html)}:\n  ${err.message}`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}

if (errors.length) {
  console.error(`\nRender failed for ${errors.length} post(s):\n${errors.join("\n")}`);
  process.exit(1);
}
