import { Router } from "express";

import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import { authenticateApiKeyMiddleware } from "../../common/middleware/authenticateApiKey";

export const externalRouter = Router();

externalRouter.get(
  "/context",
  authenticateApiKeyMiddleware,
  asyncHandler(async (req, res) => {
    sendSuccess(res, {
      data: {
        organisation: {
          id: req.organisation!.id,
          name: req.organisation!.name,
          slug: req.organisation!.slug,
        },
        apiKey: {
          id: req.apiKey!.id,
          name: req.apiKey!.name,
          keyPrefix: req.apiKey!.keyPrefix,
        },
      },
      message: "API key context retrieved successfully",
    });
  }),
);
