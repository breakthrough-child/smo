import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// The edit key is 32 random bytes; only its SHA-256 is stored (spec.md > Data Model).
export function generateEditKey(): string {
  return randomBytes(32).toString("base64url");
}

export function hashEditKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function verifyEditKey(key: string | null | undefined, storedHash: string): boolean {
  if (!key) return false;
  const a = Buffer.from(hashEditKey(key), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
