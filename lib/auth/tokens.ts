import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import { AuthToken, type AuthTokenType } from "../db/models";

const LIFETIME_MS: Record<AuthTokenType, number> = {
  "confirm-email": 7 * 24 * 60 * 60 * 1000,
  "reset-password": 60 * 60 * 1000,
};

/** Only the hash is stored, so a database leak can't be used to take over accounts. */
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Replaces any earlier token of this type, so only the latest email works. */
export async function createAuthToken(userId: Types.ObjectId, type: AuthTokenType): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await AuthToken.deleteMany({ userId, type });
  await AuthToken.create({ userId, type, tokenHash: hash(token), expiresAt: new Date(Date.now() + LIFETIME_MS[type]) });
  return token;
}

/** Single use: the token is deleted as it's read, so two clicks can't both succeed. */
export async function consumeAuthToken(token: string, type: AuthTokenType): Promise<Types.ObjectId | null> {
  const doc = await AuthToken.findOneAndDelete({ tokenHash: hash(token), type, expiresAt: { $gt: new Date() } }).lean();
  return doc?.userId ?? null;
}

/** When the last email of this type went out, to stop "resend" being used to spam. */
export async function lastTokenAt(userId: Types.ObjectId, type: AuthTokenType): Promise<Date | null> {
  const doc = await AuthToken.findOne({ userId, type }, { createdAt: 1 }).lean();
  return doc?.createdAt ?? null;
}
