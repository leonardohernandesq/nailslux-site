import mongoose from "mongoose";

type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Reuse one connection across hot reloads and serverless invocations.
const globalForMongoose = globalThis as unknown as { mongooseCache?: Cached };
const cached: Cached = (globalForMongoose.mongooseCache ??= { conn: null, promise: null });

/**
 * Live data has its own database, chosen by the deployment so that development and
 * previews can't reach it by accident. MONGODB_DB overrides it, for scripts run by hand.
 * Undefined leaves the choice to MONGODB_URI.
 */
export function databaseName(): string | undefined {
  return process.env.MONGODB_DB || (process.env.VERCEL_ENV === "production" ? "production" : undefined);
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local (see .env.example).");
  }

  const dbName = databaseName();
  cached.promise ??= mongoose.connect(uri, { bufferCommands: false, ...(dbName && { dbName }) });
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
  return cached.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cached.conn) await cached.conn.disconnect();
  cached.conn = null;
  cached.promise = null;
}
