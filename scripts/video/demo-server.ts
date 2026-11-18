/**
 * The app with made-up data, for recording the promo video (scripts/video/record.ts).
 * Like scripts/e2e-server.ts: a throwaway MongoDB, never the real database.
 *
 *   npx tsx scripts/video/demo-server.ts        (http://localhost:3200)
 *
 * Every client, phone number, booking and statistic here is invented. The services
 * are NailsLux's own; the portfolio photos come from a backup when one is given
 * (VIDEO_BACKUP=backups/<folder>), otherwise from the images in the repo.
 */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { createReadStream, existsSync } from "node:fs";
import { createGunzip } from "node:zlib";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { AppointmentStatus } from "../../lib/db/models";

export const DEMO_PORT = Number(process.env.DEMO_PORT ?? 3200);
export const DEMO_ADMIN = { email: "ana@nailslux.demo", password: "demo-password-123" };

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" in Lisbon, `offset` days from today. */
function day(offset: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date(Date.now() + offset * DAY_MS));
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

const CLIENTS = [
  { name: "Beatriz Almeida", phone: "351912000101" },
  { name: "Carolina Sousa", phone: "351913000202" },
  { name: "Inês Ferreira", phone: "351914000303" },
  { name: "Mariana Costa", phone: "351915000404" },
  { name: "Joana Ribeiro", phone: "351916000505" },
  { name: "Sofia Martins", phone: "351917000606" },
  { name: "Rita Carvalho", phone: "351918000707" },
  { name: "Ana Pereira", phone: "351919000808" },
  { name: "Leonor Gomes", phone: "351921000909" },
  { name: "Matilde Lopes", phone: "351922001010" },
];

const SERVICES = [
  { name: "Alongamento em Gel (Colocação) - Mão", priceCents: 3000, durationMinutes: 180, description: "Unhas longas e resistentes, com o formato à sua escolha." },
  { name: "Manutenção de Alongamento em Gel - Mão", priceCents: 2500, durationMinutes: 180 },
  { name: "Gelinho (Verniz Gel) - Mão", priceCents: 1500, durationMinutes: 60, description: "Cor e brilho que duram semanas." },
  { name: "Blindagem de Unhas - Mão", priceCents: 2000, durationMinutes: 120 },
  { name: "Gelinho (Verniz Gel) - Pé", priceCents: 2000, durationMinutes: 90 },
  { name: "Blindagem de Unhas - Pé", priceCents: 2500, durationMinutes: 120 },
  { name: "SPA para Pés", priceCents: 3500, durationMinutes: 180, description: "Esfoliação, hidratação e massagem." },
];

async function readJsonl(file: string): Promise<Record<string, unknown>[]> {
  const docs: Record<string, unknown>[] = [];
  const lines = createInterface({ input: createReadStream(file).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) docs.push(mongoose.mongo.BSON.EJSON.parse(line) as Record<string, unknown>);
  return docs;
}

/** Photos for the portfolio: the backup's, or the repo's own images. */
async function portfolioImages(): Promise<Buffer[]> {
  const backup = process.env.VIDEO_BACKUP;
  if (backup && existsSync(path.join(backup, "portfolioitems.jsonl.gz"))) {
    const items = await readJsonl(path.join(backup, "portfolioitems.jsonl.gz"));
    const chunks = await readJsonl(path.join(backup, "portfolio.chunks.jsonl.gz"));
    const images = items.map((item) => {
      const id = String(item.fileId);
      const parts = chunks
        .filter((chunk) => String(chunk.files_id) === id)
        .sort((a, b) => Number(a.n) - Number(b.n))
        .map((chunk) => Buffer.from((chunk.data as mongoose.mongo.BSON.Binary).buffer));
      return Buffer.concat(parts);
    });
    if (images.length > 0) return [...images, await readFile("e2e/fixtures/nails.png")];
  }
  return [await readFile("public/brand/hero-hands.webp"), await readFile("e2e/fixtures/nails.png")];
}

async function seed() {
  const { connectDB, disconnectDB } = await import("../../lib/db/connect");
  const { AnalyticsEvent, Appointment, Client, PortfolioItem, Service, Tenant, User } = await import("../../lib/db/models");
  const { processIcon, processImage, saveImage } = await import("../../lib/db/images");
  await connectDB();

  const tenant = await Tenant.create({
    slug: "nailslux",
    name: "NailsLux",
    tagline: "Studio de unhas",
    description: "Alongamentos, verniz gel e cuidados de mãos e pés, com marcação online.",
    whatsappNumber: "351912345678",
    instagramUrl: "https://www.instagram.com/nailslux.design/",
    address: "Rua das Flores 12, Lisboa",
    notifyNewBookings: false,
    emailConfirmedAt: new Date(),
  });
  const tenantId = tenant._id;

  // The studio's own look, as if uploaded in Definições (see lib/actions/brand.ts).
  const logoFile = await readFile("public/brand/logo-wordmark.png");
  const logo = await processImage(logoFile, 1200);
  const iconFile = await readFile("public/brand/studio-icon.png");
  const banner = await processImage(await readFile("public/brand/hero-hands.webp"));
  await Tenant.updateOne(
    { _id: tenantId },
    {
      logo: { fileId: await saveImage(logo.buffer, "logo.webp"), iconFileId: await saveImage(await processIcon(iconFile), "icon.png", "image/png"), width: logo.width, height: logo.height },
      favicon: { fileId: await saveImage(await processIcon(iconFile, 512), "favicon.png", "image/png"), width: 512, height: 512 },
      banner: { fileId: await saveImage(banner.buffer, "banner.webp"), width: banner.width, height: banner.height, blurDataUrl: banner.blurDataUrl },
    },
  );
  await User.create({ tenantId, name: "Ana Lux", email: DEMO_ADMIN.email, passwordHash: await bcrypt.hash(DEMO_ADMIN.password, 4) });

  const services = await Service.create(SERVICES.map((service, index) => ({ tenantId, order: index + 1, ...service })));

  const photos = await portfolioImages();
  for (const [index, photo] of photos.entries()) {
    const image = await processImage(photo);
    const fileId = await saveImage(image.buffer, `demo-${index}.webp`);
    await PortfolioItem.create({ tenantId, fileId, width: image.width, height: image.height, blurDataUrl: image.blurDataUrl, order: index });
  }

  // Bookings: a few months of past visits, this week's agenda and three new requests.
  const at = (date: string, time: string, serviceIndex: number, client: (typeof CLIENTS)[number], status: AppointmentStatus, notes?: string) => {
    const service = services[serviceIndex];
    const start = toMinutes(time);
    return {
      tenantId,
      name: client.name,
      phone: client.phone,
      serviceIds: [String(service._id)],
      serviceNames: [service.name],
      totalCents: service.priceCents,
      date,
      time,
      startMinutes: start,
      endMinutes: start + (service.durationMinutes ?? 60),
      status,
      notes,
      decidedAt: status === "pending" ? undefined : new Date(),
    };
  };
  const bookings = [];
  for (let week = 1; week <= 10; week++) {
    CLIENTS.forEach((client, i) => {
      if ((week + i) % 3 === 0) bookings.push(at(day(-week * 7 + (i % 5)), ["09:30", "11:00", "14:00", "16:30"][i % 4], i % SERVICES.length, client, "confirmed"));
    });
  }
  bookings.push(
    at(day(0), "10:00", 0, CLIENTS[0], "confirmed"),
    at(day(0), "15:00", 2, CLIENTS[1], "confirmed"),
    at(day(1), "09:30", 3, CLIENTS[2], "confirmed"),
    at(day(1), "14:00", 6, CLIENTS[3], "confirmed"),
    at(day(2), "11:00", 1, CLIENTS[4], "confirmed"),
    at(day(3), "16:00", 4, CLIENTS[5], "confirmed"),
    at(day(2), "16:30", 2, CLIENTS[6], "pending", "Queria um nude com brilho, se possível."),
    at(day(4), "10:00", 0, CLIENTS[7], "pending"),
    at(day(5), "15:30", 5, CLIENTS[8], "pending", "Primeira vez no studio!"),
  );
  await Appointment.create(bookings);

  await Client.create([
    { tenantId, phone: CLIENTS[0].phone, handMold: "4-7-6-7-9", footMold: "2-6-7-8-9", notes: "Prefere tons nude. Alérgica a acetona: usar removedor sem acetona." },
    { tenantId, phone: CLIENTS[1].phone, handMold: "5-7-6-8-9", notes: "Formato amêndoa, comprimento médio." },
  ]);

  // Statistics: visits every day of the last month, with requests and clicks.
  const events = [];
  for (let d = 29; d >= 0; d--) {
    const date = new Date(Date.now() - d * DAY_MS);
    const weekend = [0, 6].includes(date.getDay());
    const visitors = 18 + ((d * 7) % 23) + (weekend ? 12 : 0);
    for (let v = 0; v < visitors; v++) {
      const visitorId = `v${d}-${v}`;
      const createdAt = new Date(date.getTime() - (v % 10) * 3_600_000);
      events.push({ tenantId, type: "pageview", visitorId, createdAt });
      if (v % 9 === 0) {
        const service = services[(d + v) % services.length];
        const requested = new Date(createdAt.getTime() + 3 * DAY_MS);
        events.push({
          tenantId,
          type: "booking",
          visitorId,
          createdAt,
          serviceIds: [String(service._id)],
          serviceNames: [service.name],
          requestedDate: requested.toISOString().slice(0, 10),
          requestedWeekday: requested.getDay(),
          requestedHour: 9 + ((d + v) % 10),
          totalCents: service.priceCents,
        });
      }
      if (v % 7 === 1) events.push({ tenantId, type: "whatsapp_click", visitorId, createdAt, source: ["hero", "footer", "portfolio"][v % 3] });
      if (v % 11 === 2) events.push({ tenantId, type: "instagram_click", visitorId, createdAt, source: ["footer", "portfolio"][v % 2] });
    }
  }
  await AnalyticsEvent.insertMany(events);

  await disconnectDB();
}

async function main() {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri("nailslux-demo");
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = "nailslux-demo";
  await seed();

  const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", String(DEMO_PORT)], {
    stdio: "inherit",
    env: {
      ...process.env,
      MONGODB_URI: uri,
      MONGODB_DB: "nailslux-demo",
      AUTH_SECRET: "demo-only-secret-not-for-production-0000",
      REGISTRATION_OPEN: "true",
      NEXT_DIST_DIR: ".next-demo",
      // No payments or emails from the demo.
      STRIPE_SECRET_KEY: "",
      STRIPE_PRICE_ID: "",
      STRIPE_PRICE_ID_YEARLY: "",
      STRIPE_WEBHOOK_SECRET: "",
      RESEND_API_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  const shutdown = async () => {
    next.kill();
    await mongo.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  next.on("exit", async (code) => {
    await mongo.stop();
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
