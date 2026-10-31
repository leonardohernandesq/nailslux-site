/**
 * Restores a backup from scripts/backup-db.ts into an empty database, then checks
 * the counts. It refuses a database with data, so it can't overwrite anything.
 *
 *   npm run db:restore -- --from backups/production-2026-10-31-12-00-00 --to restore_check
 *
 * Reads MONGODB_URI from .env.local / .env.
 */
import { config } from "dotenv";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { createGunzip } from "node:zlib";
import mongoose from "mongoose";

config({ path: [".env.local", ".env"], quiet: true });

const { EJSON } = mongoose.mongo.BSON;
const BATCH = 200;
const { from, to } = parseArgs({ options: { from: { type: "string" }, to: { type: "string" } } }).values;

type Manifest = { collections: { name: string; count: number; indexes: ({ name: string; key: Record<string, 1 | -1> } & Record<string, unknown>)[] }[] };

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");
  if (!from || !to) throw new Error("Use --from <backup folder> --to <empty database>.");

  const manifest = JSON.parse(await readFile(path.join(from, "manifest.json"), "utf8")) as Manifest;

  const client = new mongoose.mongo.MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(to);
    if ((await db.listCollections().toArray()).length > 0) throw new Error(`The database "${to}" is not empty: nothing was changed.`);

    for (const { name, count, indexes } of manifest.collections) {
      const collection = db.collection(name);
      await db.createCollection(name);

      const lines = createInterface({ input: createReadStream(path.join(from, `${name}.jsonl.gz`)).pipe(createGunzip()) });
      let batch: mongoose.mongo.Document[] = [];
      for await (const line of lines) {
        batch.push(EJSON.parse(line, { relaxed: false }) as mongoose.mongo.Document);
        if (batch.length === BATCH) {
          await collection.insertMany(batch);
          batch = [];
        }
      }
      if (batch.length > 0) await collection.insertMany(batch);

      for (const { key, ...index } of indexes) {
        if (index.name === "_id_") continue;
        const options = Object.fromEntries(Object.entries(index).filter(([option]) => option !== "v" && option !== "ns"));
        await collection.createIndex(key, options);
      }

      const restored = await collection.countDocuments();
      if (restored !== count) throw new Error(`${name}: expected ${count}, restored ${restored}.`);
      console.log(`  ${name}: ${restored}`);
    }
    console.log(`\nRestored into "${to}".`);
  } finally {
    await client.close();
  }
}

main().catch((error: Error) => {
  console.error(`Restore failed: ${error.message.replace(/\/\/[^@]*@/, "//***@")}`);
  process.exit(1);
});
