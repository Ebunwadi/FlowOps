import express, { type Express } from "express";
import request from "supertest";

import { errorHandler } from "../src/common/middleware/errorHandler";
import { createRequirePermissionMiddleware } from "../src/common/middleware/requirePermission";
import { MembershipStatus } from "../src/generated/prisma/client";
import { logger } from "../src/config/logger";

const ROLE_ID = "role-staff";

function attachMembership(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
): void {
  req.membership = {
    id: "member-1",
    userId: "user-1",
    organisationId: "550e8400-e29b-41d4-a716-446655440000",
    roleId: ROLE_ID,
    status: MembershipStatus.ACTIVE,
    joinedAt: new Date("2026-06-11T12:00:00.000Z"),
    role: {
      id: ROLE_ID,
      name: "Staff",
    },
  };
  next();
}

function createProtectedApp(
  lookupPermissionKeys: (roleId: string) => Promise<string[]>,
  requiredKeys: string[],
  options?: { match?: "all" | "any" },
): Express {
  const app = express();
  app.use(express.json());
  app.use(attachMembership);
  app.get(
    "/protected",
    createRequirePermissionMiddleware(requiredKeys, lookupPermissionKeys, options),
    (_req, res) => {
      res.status(200).json({ success: true });
    },
  );
  app.use(errorHandler(logger));
  return app;
}

describe("requirePermission middleware", () => {
  const lookupWithPermissions =
    (permissions: string[]) =>
    async (_roleId: string): Promise<string[]> =>
      permissions;

  it("allows access when the role has the required permission", async () => {
    const app = createProtectedApp(
      lookupWithPermissions(["workflows:create", "workflows:view"]),
      ["workflows:create"],
    );

    await request(app).get("/protected").expect(200);
  });

  it("returns 403 when the role is missing the required permission", async () => {
    const app = createProtectedApp(
      lookupWithPermissions(["workflows:view"]),
      ["workflows:create"],
    );

    const response = await request(app).get("/protected").expect(403);

    expect(response.body.message).toBe("Missing required permission: workflows:create");
  });

  it("requires every permission when multiple keys are provided", async () => {
    const app = createProtectedApp(
      lookupWithPermissions(["workflows:create"]),
      ["workflows:create", "workflows:update"],
    );

    const response = await request(app).get("/protected").expect(403);

    expect(response.body.message).toBe(
      "Missing required permissions: workflows:create, workflows:update",
    );
  });

  it("allows access when the role has all required permissions", async () => {
    const app = createProtectedApp(
      lookupWithPermissions(["workflows:create", "workflows:update"]),
      ["workflows:create", "workflows:update"],
    );

    await request(app).get("/protected").expect(200);
  });

  it("supports any-of permission checks", async () => {
    const app = createProtectedApp(
      lookupWithPermissions(["workflows:view"]),
      ["workflows:create", "workflows:view"],
      { match: "any" },
    );

    await request(app).get("/protected").expect(200);
  });

  it("returns 403 when none of the any-of permissions are granted", async () => {
    const app = createProtectedApp(
      lookupWithPermissions(["requests:create"]),
      ["workflows:create", "workflows:view"],
      { match: "any" },
    );

    const response = await request(app).get("/protected").expect(403);

    expect(response.body.message).toBe(
      "Missing one of the required permissions: workflows:create, workflows:view",
    );
  });

  it("returns 400 when organisation context is missing", async () => {
    const app = express();
    app.use(express.json());
    app.get(
      "/protected",
      createRequirePermissionMiddleware(["workflows:create"], async () => []),
      (_req, res) => {
        res.status(200).json({ success: true });
      },
    );
    app.use(errorHandler(logger));

    const response = await request(app).get("/protected").expect(400);

    expect(response.body.message).toBe(
      "Organisation context is required before checking permissions",
    );
  });

  it("caches role permissions on the request for repeated checks", async () => {
    let lookupCalls = 0;

    const lookup = async (): Promise<string[]> => {
      lookupCalls += 1;
      return ["workflows:create"];
    };

    const app = express();
    app.use(express.json());
    app.use(attachMembership);
    app.get(
      "/double-check",
      createRequirePermissionMiddleware(["workflows:create"], lookup),
      createRequirePermissionMiddleware(["workflows:create"], lookup),
      (_req, res) => {
        res.status(200).json({ success: true });
      },
    );
    app.use(errorHandler(logger));

    await request(app).get("/double-check").expect(200);
    expect(lookupCalls).toBe(1);
  });
});
