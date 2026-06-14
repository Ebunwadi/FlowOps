import { generateKeyPairSync } from "node:crypto";

import express, { Router, type Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";

import { StaticKeyTokenVerifier } from "../src/auth/static-token-verifier";
import { ConflictError, NotFoundError } from "../src/common/errors/httpErrors";
import { createAuthenticateMiddleware } from "../src/common/middleware/authenticate";
import { ensureLocalUser } from "../src/common/middleware/ensureLocalUser";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { logger } from "../src/config/logger";
import {
  createOrganisationController,
  getCurrentOrganisationController,
  getOrganisationByIdController,
  listOrganisationsController,
  updateOrganisationController,
} from "../src/modules/organisations/organisation.controller";
import * as organisationService from "../src/modules/organisations/organisation.service";
import {
  createOrganisationSchema,
  updateOrganisationSchema,
} from "../src/modules/organisations/organisation.validation";
import * as userService from "../src/modules/users/user.service";
import { z } from "zod";

jest.mock("../src/modules/users/user.service");
jest.mock("../src/modules/organisations/organisation.service");

const TEST_ISSUER = "http://test.local/realms/flowops";
const TEST_CLIENT_ID = "flowops-web";

const organisationIdParamSchema = z.object({
  id: z.string().uuid(),
});

function createOrganisationsTestApp(verifier: StaticKeyTokenVerifier): Express {
  const app = express();
  app.use(express.json());

  const router = Router();
  router.use(createAuthenticateMiddleware(verifier), ensureLocalUser);

  router.post(
    "/",
    validateRequest({ body: createOrganisationSchema }),
    createOrganisationController,
  );
  router.get("/current", getCurrentOrganisationController);
  router.get("/", listOrganisationsController);
  router.get(
    "/:id",
    validateRequest({ params: organisationIdParamSchema }),
    getOrganisationByIdController,
  );
  router.patch(
    "/:id",
    validateRequest({
      body: updateOrganisationSchema,
      params: organisationIdParamSchema,
    }),
    updateOrganisationController,
  );

  app.use("/api/organisations", router);
  app.use(errorHandler(logger));
  return app;
}

describe("Organisation API", () => {
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

  const app = createOrganisationsTestApp(verifier);

  const localUser = {
    id: "local-user-id-1",
    keycloakUserId: "keycloak-user-id-1",
    email: "test.user@flowops.local",
    firstName: "Test",
    lastName: "User",
    createdAt: new Date("2026-06-08T12:00:00.000Z"),
    updatedAt: new Date("2026-06-08T12:00:00.000Z"),
  };

  const organisationResponse = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "FlowOps Demo Organisation",
    slug: "flowops-demo",
    role: "Owner",
    createdAt: "2026-06-11T12:00:00.000Z",
    updatedAt: "2026-06-11T12:00:00.000Z",
  };

  const createdOrganisationResponse = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "FlowOps Demo Organisation",
    slug: "flowops-demo",
    role: "Owner",
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

  describe("POST /api/organisations", () => {
    it("creates an organisation for the authenticated user", async () => {
      jest
        .mocked(organisationService.createOrganisationForUser)
        .mockResolvedValue(createdOrganisationResponse);

      const response = await request(app)
        .post("/api/organisations")
        .set("Authorization", `Bearer ${signTestToken()}`)
        .send({
          name: "FlowOps Demo Organisation",
          slug: "flowops-demo",
        })
        .expect(201);

      expect(organisationService.createOrganisationForUser).toHaveBeenCalledWith(
        localUser.id,
        {
          name: "FlowOps Demo Organisation",
          slug: "flowops-demo",
        },
      );
      expect(response.body.message).toBe("Organisation created successfully");
      expect(response.body.data).toEqual(createdOrganisationResponse);
    });

    it("returns 409 when the slug is already taken", async () => {
      jest
        .mocked(organisationService.createOrganisationForUser)
        .mockRejectedValue(
          new ConflictError("An organisation with this slug already exists"),
        );

      const response = await request(app)
        .post("/api/organisations")
        .set("Authorization", `Bearer ${signTestToken()}`)
        .send({
          name: "FlowOps Demo Organisation",
          slug: "flowops-demo",
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it("returns 400 for an invalid slug", async () => {
      await request(app)
        .post("/api/organisations")
        .set("Authorization", `Bearer ${signTestToken()}`)
        .send({
          name: "FlowOps Demo Organisation",
          slug: "Invalid Slug",
        })
        .expect(400);

      expect(organisationService.createOrganisationForUser).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/organisations/current", () => {
    it("returns the user's current organisation", async () => {
      jest
        .mocked(organisationService.getCurrentOrganisationForUser)
        .mockResolvedValue(organisationResponse);

      const response = await request(app)
        .get("/api/organisations/current")
        .set("Authorization", `Bearer ${signTestToken()}`)
        .expect(200);

      expect(organisationService.getCurrentOrganisationForUser).toHaveBeenCalledWith(
        localUser.id,
      );
      expect(response.body.data).toEqual(organisationResponse);
    });

    it("returns 404 when the user has no organisations", async () => {
      jest
        .mocked(organisationService.getCurrentOrganisationForUser)
        .mockRejectedValue(new NotFoundError("No organisation found for this user"));

      await request(app)
        .get("/api/organisations/current")
        .set("Authorization", `Bearer ${signTestToken()}`)
        .expect(404);
    });
  });

  describe("GET /api/organisations", () => {
    it("lists organisations the user belongs to", async () => {
      jest
        .mocked(organisationService.listOrganisationsForUser)
        .mockResolvedValue([organisationResponse]);

      const response = await request(app)
        .get("/api/organisations")
        .set("Authorization", `Bearer ${signTestToken()}`)
        .expect(200);

      expect(organisationService.listOrganisationsForUser).toHaveBeenCalledWith(
        localUser.id,
      );
      expect(response.body.data).toEqual([organisationResponse]);
    });
  });

  describe("GET /api/organisations/:id", () => {
    it("returns 400 when the organisation id is not a uuid", async () => {
      await request(app)
        .get("/api/organisations/org-1")
        .set("Authorization", `Bearer ${signTestToken()}`)
        .expect(400);

      expect(organisationService.getOrganisationByIdForUser).not.toHaveBeenCalled();
    });

    it("returns an organisation when the user is a member", async () => {
      jest
        .mocked(organisationService.getOrganisationByIdForUser)
        .mockResolvedValue(organisationResponse);

      const response = await request(app)
        .get("/api/organisations/550e8400-e29b-41d4-a716-446655440000")
        .set("Authorization", `Bearer ${signTestToken()}`)
        .expect(200);

      expect(organisationService.getOrganisationByIdForUser).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440000",
        localUser.id,
      );
      expect(response.body.data).toEqual(organisationResponse);
    });

    it("returns 404 when the user is not a member", async () => {
      jest
        .mocked(organisationService.getOrganisationByIdForUser)
        .mockRejectedValue(new NotFoundError("Organisation not found"));

      await request(app)
        .get("/api/organisations/550e8400-e29b-41d4-a716-446655440000")
        .set("Authorization", `Bearer ${signTestToken()}`)
        .expect(404);
    });
  });

  describe("PATCH /api/organisations/:id", () => {
    it("updates an organisation for a member", async () => {
      jest
        .mocked(organisationService.updateOrganisationForUser)
        .mockResolvedValue({
          ...organisationResponse,
          name: "Updated Organisation",
        });

      const response = await request(app)
        .patch("/api/organisations/550e8400-e29b-41d4-a716-446655440000")
        .set("Authorization", `Bearer ${signTestToken()}`)
        .send({ name: "Updated Organisation" })
        .expect(200);

      expect(organisationService.updateOrganisationForUser).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440000",
        localUser.id,
        { name: "Updated Organisation" },
      );
      expect(response.body.data.name).toBe("Updated Organisation");
    });
  });
});
