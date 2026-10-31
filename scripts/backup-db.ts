/**
 * Saves a database to backups/<db>-<date>/, photos included: one gzipped file per
 * collection, in Extended JSON so that ids, dates and binary data survive. Only reads.
 * Keep the backups private: they hold client data and password hashes.
 *
 *   npm run db:backup                 (the production database)
 *   npm run db:backup -- --db test
 *
 * Restore with scripts/restore-db.ts. Reads MONGODB_URI from .env.local / .env.
 */
import { config } from "dotenv";
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { parseArgs } from "node:util";
import { createGzip } from "node:zlib";
import mongoose from "mongoose";

config({ path: [".env.local", ".env"], quiet: true });

const { EJSON } = mongoose.mongo.BSON;
const { db: dbName = "production" } = parseArgs({ options: { db: { type: "string" } } }).values;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");

  const client = new mongoose.mongo.MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    const collections = (await db.listCollections().toArray()).filter((c) => c.type === "collection");
    if (collections.length === 0) throw new Error(`The database "${dbName}" has nothing to back up.`);

    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const folder = path.join("backups", `${dbName}-${stamp}`);
    await mkdir(folder, { recursive: true });

    const manifest = [];
    for (const { name } of collections) {
      const collection = db.collection(name);
      let count = 0;
      const lines = Readable.from(
        (async function* () {
          for await (const doc of collection.find()) {
            count++;
            yield `${EJSON.stringify(doc, { relaxed: false })}\n`;
          }
        })(),
      );
      await pipeline(lines, createGzip(), createWriteStream(path.join(folder, `${name}.jsonl.gz`)));
      manifest.push({ name, count, indexes: await collection.indexes() });
      console.log(`  ${name}: ${count}`);
    }

    await writeFile(path.join(folder, "manifest.json"), JSON.stringify({ database: dbName, createdAt: new Date(), collections: manifest }, null, 2));
    console.log(`\nSaved to ${folder}`);
  } finally {
    await client.close();
  }
}

main().catch((error: Error) => {
  console.error(`Backup failed: ${error.message.replace(/\/\/[^@]*@/, "//***@")}`);
  process.exit(1);
});
