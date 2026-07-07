import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export const API_KEY_PREFIX = "flowops_live_";
export const API_KEY_PREFIX_LOOKUP_LENGTH = 20;

export function generateRawApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function extractApiKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, API_KEY_PREFIX_LOOKUP_LENGTH);
}

export async function hashApiKey(rawKey: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(rawKey, salt, 64)) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyApiKey(rawKey: string, storedHash: string): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(":");

  if (!salt || !hashHex) {
    return false;
  }

  const derivedKey = (await scryptAsync(rawKey, salt, 64)) as Buffer;
  const storedKey = Buffer.from(hashHex, "hex");

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}
