import { createHmac } from "node:crypto";

export const WEBHOOK_SIGNATURE_HEADER = "x-flowops-signature";

export function createWebhookSignature(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  signature: string,
): boolean {
  const expected = createWebhookSignature(secret, rawBody);
  return expected === signature;
}
