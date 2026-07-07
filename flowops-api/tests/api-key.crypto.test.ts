import {
  extractApiKeyPrefix,
  generateRawApiKey,
  hashApiKey,
  verifyApiKey,
} from "../src/modules/api-keys/api-key.crypto";

describe("api key crypto", () => {
  it("generates keys with the flowops_live prefix", () => {
    const rawKey = generateRawApiKey();

    expect(rawKey.startsWith("flowops_live_")).toBe(true);
    expect(rawKey.length).toBeGreaterThan("flowops_live_".length);
  });

  it("hashes and verifies API keys without storing the raw secret", async () => {
    const rawKey = generateRawApiKey();
    const keyHash = await hashApiKey(rawKey);

    expect(keyHash).not.toContain(rawKey);
    await expect(verifyApiKey(rawKey, keyHash)).resolves.toBe(true);
    await expect(verifyApiKey(`${rawKey}x`, keyHash)).resolves.toBe(false);
  });

  it("extracts a stable lookup prefix", () => {
    const rawKey = generateRawApiKey();
    expect(extractApiKeyPrefix(rawKey)).toBe(rawKey.slice(0, 20));
  });
});
