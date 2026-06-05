import express, { type Express, type Request, type Response } from "express";
import request from "supertest";
import { z } from "zod";

import {
  AuthenticationError,
  ExternalServiceError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "../src/common/errors/httpErrors";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { notFoundHandler } from "../src/common/middleware/notFoundHandler";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { createApp } from "../src/app";
import { logger } from "../src/config/logger";

jest.mock("../src/config/database", () => ({
  checkDatabaseConnection: jest.fn().mockResolvedValue(true),
  disconnectDatabase: jest.fn().mockResolvedValue(undefined),
  prisma: {},
}));

interface ErrorResponse {
  success: boolean;
  message: string;
  errors: Array<{ field?: string; message: string }>;
}

function createErrorTestApp(registerRoutes: (app: Express) => void): Express {
  const app = express();

  app.use(express.json());
  registerRoutes(app);
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}

describe("global error handling", () => {
  it("returns 404 for unknown routes", async () => {
    const response = await request(createApp()).get("/api/unknown-route").expect(404);
    const body = response.body as ErrorResponse;

    expect(body.success).toBe(false);
    expect(body.message).toContain("Route not found");
    expect(body.errors).toEqual([]);
  });

  it("returns 400 for validation errors with field details", async () => {
    const app = createErrorTestApp((instance) => {
      instance.get("/validation", (_req: Request, _res: Response) => {
        throw new ValidationError("Validation failed", [
          { field: "email", message: "Email is required" },
        ]);
      });
    });

    const response = await request(app).get("/validation").expect(400);
    const body = response.body as ErrorResponse;

    expect(body.success).toBe(false);
    expect(body.message).toBe("Validation failed");
    expect(body.errors).toEqual([{ field: "email", message: "Email is required" }]);
  });

  it("returns 401 for authentication errors", async () => {
    const app = createErrorTestApp((instance) => {
      instance.get("/auth", () => {
        throw new AuthenticationError();
      });
    });

    const response = await request(app).get("/auth").expect(401);
    const body = response.body as ErrorResponse;

    expect(body.success).toBe(false);
    expect(body.message).toBe("Authentication required");
  });

  it("returns 429 for rate limit errors", async () => {
    const app = createErrorTestApp((instance) => {
      instance.get("/rate-limit", () => {
        throw new RateLimitError();
      });
    });

    const response = await request(app).get("/rate-limit").expect(429);
    const body = response.body as ErrorResponse;

    expect(body.success).toBe(false);
    expect(body.message).toBe("Too many requests");
  });

  it("returns 502 for external service errors", async () => {
    const app = createErrorTestApp((instance) => {
      instance.get("/external", () => {
        throw new ExternalServiceError();
      });
    });

    const response = await request(app).get("/external").expect(502);
    const body = response.body as ErrorResponse;

    expect(body.success).toBe(false);
    expect(body.message).toBe("External service unavailable");
  });

  it("returns 500 without exposing unexpected error details", async () => {
    const app = createErrorTestApp((instance) => {
      instance.get("/internal", (_req, _res, next) => {
        next(new Error("Sensitive database failure"));
      });
    });

    const response = await request(app).get("/internal").expect(500);
    const body = response.body as ErrorResponse;

    expect(body.success).toBe(false);
    expect(body.message).toBe("Internal server error");
    expect(body.errors).toEqual([]);
  });

  it("returns 400 for zod validation failures", async () => {
    const app = createErrorTestApp((instance) => {
      instance.post(
        "/users",
        validateRequest({
          body: z.object({
            email: z.string().email(),
          }),
        }),
        (_req: Request, res: Response) => {
          res.status(201).json({ success: true });
        },
      );
    });

    const response = await request(app).post("/users").send({ email: "not-an-email" }).expect(400);
    const body = response.body as ErrorResponse;

    expect(body.success).toBe(false);
    expect(body.message).toBe("Validation failed");
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "email",
          message: expect.any(String) as string,
        }),
      ]),
    );
  });

  it("passes through explicit not found errors", async () => {
    const app = createErrorTestApp((instance) => {
      instance.get("/missing", () => {
        throw new NotFoundError("Workflow template not found");
      });
    });

    const response = await request(app).get("/missing").expect(404);
    const body = response.body as ErrorResponse;

    expect(body.success).toBe(false);
    expect(body.message).toBe("Workflow template not found");
  });
});
