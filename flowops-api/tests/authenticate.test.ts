import { generateKeyPairSync } from "node:crypto";

import express, { type Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";

import { StaticKeyTokenVerifier } from "../src/auth/static-token-verifier";
import { createAuthenticateMiddleware } from "../src/common/middleware/authenticate";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { logger } from "../src/config/logger";
import { getMeController } from "../src/modules/me/me.controller";

const TEST_ISSUER = "http://test.local/realms/flowops";
const TEST_CLIENT_ID = "flowops-web";

interface TestAuthContext {
  app: Express;
  signAccessToken: (overrides?: Record<string, unknown>) => string;
}

function createTestAuthApp(): TestAuthContext {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  const verifier = new StaticKeyTokenVerifier(
    TEST_ISSUER,
    TEST_CLIENT_ID,
    publicKeyPem,
  );

  const app = express();
  app.use(express.json());
  app.get("/protected", createAuthenticateMiddleware(verifier), (_req, res) => {
    res.status(200).json({ success: true });
  });
  app.get("/api/me", createAuthenticateMiddleware(verifier), getMeController);
  app.use(errorHandler(logger));

  const signAccessToken = (overrides: Record<string, unknown> = {}) =>
    jwt.sign(
      {
        azp: TEST_CLIENT_ID,
        email: "test.user@flowops.local",
        name: "Test User",
        preferred_username: "test.user",
        realm_access: { roles: ["user"] },
        ...overrides,
      },
      privateKeyPem,
      {
        algorithm: "RS256",
        expiresIn: "2h",
        issuer: TEST_ISSUER,
        subject: "keycloak-user-id-1",
      },
    );

  return { app, signAccessToken };
}

describe("JWT authentication middleware", () => {
  it("rejects requests without an Authorization header", async () => {
    const { app } = createTestAuthApp();

    const response = await request(app).get("/protected").expect(401);

    expect(response.body.message).toBe("Missing or invalid Authorization header");
  });

  it("rejects requests with an invalid token", async () => {
    const { app } = createTestAuthApp();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer not-a-real-token")
      .expect(401);

    expect(response.body.message).toBe("Invalid or expired access token");
  });

  it("rejects tokens issued for a different client", async () => {
    const { app, signAccessToken } = createTestAuthApp();
    const token = signAccessToken({ azp: "other-client" });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body.message).toBe("Invalid or expired access token");
  });

  it("accepts a valid Keycloak access token and exposes req.user on /api/me", async () => {
    const { app, signAccessToken } = createTestAuthApp();
    const token = signAccessToken();

    const response = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      id: "keycloak-user-id-1",
      username: "test.user",
      email: "test.user@flowops.local",
      name: "Test User",
      roles: ["user"],
      clientId: TEST_CLIENT_ID,
    });
  });
});
