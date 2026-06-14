import express, { type Express } from "express";
import request from "supertest";

import {
  createEnsureOrganisationContextMiddleware,
  ORGANISATION_ID_HEADER,
} from "../src/common/middleware/ensureOrganisationContext";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { MembershipStatus } from "../src/generated/prisma/client";
import { logger } from "../src/config/logger";

const ORGANISATION_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "local-user-id-1";

const organisation = {
  id: ORGANISATION_ID,
  name: "FlowOps Demo Organisation",
  slug: "flowops-demo",
  createdById: USER_ID,
  createdAt: new Date("2026-06-11T12:00:00.000Z"),
  updatedAt: new Date("2026-06-11T12:00:00.000Z"),
};

const membership = {
  id: "member-1",
  userId: USER_ID,
  organisationId: ORGANISATION_ID,
  roleId: "role-owner",
  status: MembershipStatus.ACTIVE,
  joinedAt: new Date("2026-06-11T12:00:00.000Z"),
  organisation,
  role: {
    id: "role-owner",
    name: "Owner",
  },
};

function createTestApp(
  lookupMembership: (
    userId: string,
    organisationId: string,
  ) => Promise<typeof membership | null>,
): Express {
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    req.localUser = {
      id: USER_ID,
      keycloakUserId: "keycloak-user-id-1",
      email: "test.user@flowops.local",
      firstName: "Test",
      lastName: "User",
      createdAt: new Date("2026-06-08T12:00:00.000Z"),
      updatedAt: new Date("2026-06-08T12:00:00.000Z"),
    };
    next();
  });

  app.get(
    "/org-context",
    createEnsureOrganisationContextMiddleware(lookupMembership),
    (req, res) => {
      res.status(200).json({
        organisationId: req.organisation?.id,
        membershipId: req.membership?.id,
        role: req.membership?.role.name,
      });
    },
  );

  app.use(errorHandler(logger));
  return app;
}

describe("ensureOrganisationContext middleware", () => {
  it("attaches organisation and membership when the user is a member", async () => {
    const app = createTestApp(async () => membership);

    const response = await request(app)
      .get("/org-context")
      .set(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .expect(200);

    expect(response.body).toEqual({
      organisationId: ORGANISATION_ID,
      membershipId: "member-1",
      role: "Owner",
    });
  });

  it("returns 400 when the organisation header is missing", async () => {
    const app = createTestApp(async () => membership);

    const response = await request(app).get("/org-context").expect(400);

    expect(response.body.message).toBe(
      `Organisation context is required (${ORGANISATION_ID_HEADER} header)`,
    );
  });

  it("returns 400 when the organisation id is not a uuid", async () => {
    const app = createTestApp(async () => membership);

    const response = await request(app)
      .get("/org-context")
      .set(ORGANISATION_ID_HEADER, "not-a-uuid")
      .expect(400);

    expect(response.body.message).toBe("Invalid organisation id");
  });

  it("returns 403 when the user is not a member", async () => {
    const app = createTestApp(async () => null);

    const response = await request(app)
      .get("/org-context")
      .set(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .expect(403);

    expect(response.body.message).toBe("You do not belong to this organisation");
  });

  it("returns 401 when local user is not loaded", async () => {
    const app = express();
    app.use(express.json());
    app.get(
      "/org-context",
      createEnsureOrganisationContextMiddleware(async () => membership),
      (_req, res) => {
        res.status(200).json({ success: true });
      },
    );
    app.use(errorHandler(logger));

    const response = await request(app)
      .get("/org-context")
      .set(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .expect(401);

    expect(response.body.message).toBe("Authentication required");
  });
});
