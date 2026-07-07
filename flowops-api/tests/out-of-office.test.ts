import express, { Router, type Express } from "express";
import request from "supertest";

import { errorHandler } from "../src/common/middleware/errorHandler";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { MembershipStatus } from "../src/generated/prisma/client";
import {
  createOutOfOfficeRuleController,
  listOutOfOfficeRulesController,
  updateOutOfOfficeRuleController,
} from "../src/modules/out-of-office/out-of-office.controller";
import * as outOfOfficeService from "../src/modules/out-of-office/out-of-office.service";
import {
  createOutOfOfficeRuleSchema,
  outOfOfficeRuleParamsSchema,
  updateOutOfOfficeRuleSchema,
} from "../src/modules/out-of-office/out-of-office.validation";

jest.mock("../src/modules/out-of-office/out-of-office.service");

const organisationId = "550e8400-e29b-41d4-a716-446655440000";
const userId = "770e8400-e29b-41d4-a716-446655440002";
const delegateUserId = "660e8400-e29b-41d4-a716-446655440001";
const ruleId = "88888888-8888-4888-8888-888888888888";

function attachTestContext(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
): void {
  req.localUser = {
    id: userId,
    keycloakUserId: "keycloak-user-id-1",
    email: "test.user@flowops.local",
    firstName: "Test",
    lastName: "User",
    createdAt: new Date("2026-06-08T12:00:00.000Z"),
    updatedAt: new Date("2026-06-08T12:00:00.000Z"),
  };
  req.organisation = {
    id: organisationId,
    name: "FlowOps Demo Organisation",
    slug: "flowops-demo",
    createdById: userId,
    createdAt: new Date("2026-06-11T12:00:00.000Z"),
    updatedAt: new Date("2026-06-11T12:00:00.000Z"),
  };
  req.membership = {
    id: "member-1",
    userId,
    organisationId,
    roleId: "44444444-4444-4444-8444-444444444444",
    status: MembershipStatus.ACTIVE,
    joinedAt: new Date("2026-06-11T12:00:00.000Z"),
    role: {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Approver",
    },
  };
  next();
}

function createOutOfOfficeTestApp(): Express {
  const app = express();
  app.use(express.json());

  const router = Router();
  router.use(attachTestContext);

  router.get("/", listOutOfOfficeRulesController);

  router.post(
    "/",
    validateRequest({ body: createOutOfOfficeRuleSchema }),
    createOutOfOfficeRuleController,
  );

  router.patch(
    "/:id",
    validateRequest({
      params: outOfOfficeRuleParamsSchema,
      body: updateOutOfOfficeRuleSchema,
    }),
    updateOutOfOfficeRuleController,
  );

  app.use("/out-of-office", router);
  app.use(errorHandler);

  return app;
}

describe("out-of-office routes", () => {
  const app = createOutOfOfficeTestApp();

  const ruleResponse = {
    id: ruleId,
    delegateTo: {
      id: delegateUserId,
      firstName: "Alex",
      lastName: "Delegate",
      email: "delegate@example.com",
    },
    startsAt: "2026-07-01T00:00:00.000Z",
    endsAt: "2026-07-31T23:59:59.000Z",
    isActive: true,
    createdAt: "2026-07-01T10:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the current user's out-of-office rules", async () => {
    jest.mocked(outOfOfficeService.listOutOfOfficeRules).mockResolvedValue([ruleResponse]);

    const response = await request(app).get("/out-of-office").expect(200);

    expect(outOfOfficeService.listOutOfOfficeRules).toHaveBeenCalledWith(
      organisationId,
      userId,
    );
    expect(response.body.data).toEqual([ruleResponse]);
  });

  it("creates an out-of-office rule for the current user", async () => {
    jest.mocked(outOfOfficeService.createOutOfOfficeRule).mockResolvedValue(ruleResponse);

    const response = await request(app)
      .post("/out-of-office")
      .send({
        delegateToId: delegateUserId,
        startsAt: "2026-07-01T00:00:00.000Z",
        endsAt: "2026-07-31T23:59:59.000Z",
      })
      .expect(201);

    expect(outOfOfficeService.createOutOfOfficeRule).toHaveBeenCalledWith(
      organisationId,
      userId,
      expect.objectContaining({
        delegateToId: delegateUserId,
      }),
    );
    expect(response.body.data).toEqual(ruleResponse);
  });

  it("updates an out-of-office rule", async () => {
    jest.mocked(outOfOfficeService.updateOutOfOfficeRule).mockResolvedValue({
      ...ruleResponse,
      isActive: false,
    });

    const response = await request(app)
      .patch(`/out-of-office/${ruleId}`)
      .send({ isActive: false })
      .expect(200);

    expect(outOfOfficeService.updateOutOfOfficeRule).toHaveBeenCalledWith(
      organisationId,
      userId,
      ruleId,
      { isActive: false },
    );
    expect(response.body.data.isActive).toBe(false);
  });
});
