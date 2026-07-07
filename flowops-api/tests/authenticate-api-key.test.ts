import express, { type Express } from "express";
import request from "supertest";

import { AuthenticationError, AuthorizationError } from "../src/common/errors/httpErrors";
import { createAuthenticateApiKeyMiddleware } from "../src/common/middleware/authenticateApiKey";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { externalRouter } from "../src/modules/external/external.routes";
import { logger } from "../src/config/logger";

const organisation = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "FlowOps Demo Organisation",
  slug: "flowops-demo",
  createdById: "user-1",
  createdAt: new Date("2026-06-11T12:00:00.000Z"),
  updatedAt: new Date("2026-06-11T12:00:00.000Z"),
};

function createExternalTestApp(
  authenticator: (rawKey: string) => Promise<{
    apiKey: {
      id: string;
      name: string;
      organisationId: string;
      keyPrefix: string;
      scopes: unknown;
    };
    organisation: typeof organisation;
  }>,
): Express {
  const app = express();
  app.use(express.json());

  const router = express.Router();
  router.get(
    "/context",
    createAuthenticateApiKeyMiddleware(authenticator),
    (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          organisation: {
            id: req.organisation!.id,
            name: req.organisation!.name,
            slug: req.organisation!.slug,
          },
          apiKey: req.apiKey,
        },
      });
    },
  );

  app.use("/api/external", router);
  app.use(errorHandler(logger));
  return app;
}

describe("authenticateApiKey middleware", () => {
  const validAuthenticator = async () => ({
    apiKey: {
      id: "88888888-8888-4888-8888-888888888888",
      name: "Integration key",
      organisationId: organisation.id,
      keyPrefix: "flowops_live_abcd1234",
      scopes: null,
    },
    organisation,
  });

  it("authenticates requests with a valid x-api-key header", async () => {
    const app = createExternalTestApp(validAuthenticator);

    const response = await request(app)
      .get("/api/external/context")
      .set("x-api-key", "flowops_live_secretvalue123");

    expect(response.status).toBe(200);
    expect(response.body.data.organisation.id).toBe(organisation.id);
    expect(response.body.data.apiKey.name).toBe("Integration key");
  });

  it("returns 401 when the API key header is missing", async () => {
    const app = createExternalTestApp(validAuthenticator);

    const response = await request(app).get("/api/external/context");

    expect(response.status).toBe(401);
  });

  it("returns 401 for invalid API keys", async () => {
    const app = createExternalTestApp(async () => {
      throw new AuthenticationError("Invalid API key");
    });

    const response = await request(app)
      .get("/api/external/context")
      .set("x-api-key", "flowops_live_badkey");

    expect(response.status).toBe(401);
  });

  it("returns 403 when API keys are disabled for the organisation", async () => {
    const app = createExternalTestApp(async () => {
      throw new AuthorizationError("API keys are disabled for this organisation");
    });

    const response = await request(app)
      .get("/api/external/context")
      .set("x-api-key", "flowops_live_secretvalue123");

    expect(response.status).toBe(403);
  });
});

describe("external context route", () => {
  it("mounts the API key protected context route", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/external", externalRouter);
    app.use(errorHandler(logger));

    const response = await request(app).get("/api/external/context");

    expect(response.status).toBe(401);
  });
});
