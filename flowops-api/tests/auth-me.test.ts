import { generateKeyPairSync } from "node:crypto";

import express, { type Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";

import { StaticKeyTokenVerifier } from "../src/auth/static-token-verifier";
import { createAuthenticateMiddleware } from "../src/common/middleware/authenticate";
import { ensureLocalUser } from "../src/common/middleware/ensureLocalUser";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { logger } from "../src/config/logger";
import { getCurrentUserController } from "../src/modules/auth/auth.controller";
import * as userService from "../src/modules/users/user.service";

jest.mock("../src/modules/users/user.service");

const TEST_ISSUER = "http://test.local/realms/flowops";
const TEST_CLIENT_ID = "flowops-web";

function createAuthMeTestApp(verifier: StaticKeyTokenVerifier): Express {
  const app = express();
  app.use(express.json());
  app.get(
    "/api/auth/me",
    createAuthenticateMiddleware(verifier),
    ensureLocalUser,
    getCurrentUserController,
  );
  app.get(
    "/api/me",
    createAuthenticateMiddleware(verifier),
    ensureLocalUser,
    getCurrentUserController,
  );
  app.use(errorHandler(logger));
  return app;
}

describe("GET /api/auth/me", () => {
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

  const app = createAuthMeTestApp(verifier);

  const localUser = {
    id: "local-user-id-1",
    keycloakUserId: "keycloak-user-id-1",
    email: "test.user@flowops.local",
    firstName: "Test",
    lastName: "User",
    createdAt: new Date("2026-06-08T12:00:00.000Z"),
    updatedAt: new Date("2026-06-08T12:00:00.000Z"),
  };

  const expectedProfile = {
    id: localUser.id,
    keycloakUserId: localUser.keycloakUserId,
    email: localUser.email,
    firstName: localUser.firstName,
    lastName: localUser.lastName,
    username: "test.user",
    roles: ["user"],
    createdAt: localUser.createdAt.toISOString(),
    updatedAt: localUser.updatedAt.toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(userService.syncUserFromKeycloak).mockResolvedValue(localUser);
  });

  function signTestToken(): string {
    return jwt.sign(
      {
        azp: TEST_CLIENT_ID,
        email: "test.user@flowops.local",
        name: "Test User",
        preferred_username: "test.user",
        realm_access: { roles: ["user"] },
      },
      privateKeyPem,
      {
        algorithm: "RS256",
        expiresIn: "2h",
        issuer: TEST_ISSUER,
        subject: "keycloak-user-id-1",
      },
    );
  }

  it("returns the synced local user profile with session roles", async () => {
    const token = signTestToken();

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(userService.syncUserFromKeycloak).toHaveBeenCalledTimes(1);
    expect(response.body.message).toBe("Current user retrieved successfully");
    expect(response.body.data).toEqual(expectedProfile);
  });

  it("returns 401 when no bearer token is provided", async () => {
    await request(app).get("/api/auth/me").expect(401);
  });

  it("supports the legacy GET /api/me alias", async () => {
    const token = signTestToken();

    const response = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toEqual(expectedProfile);
  });
});
