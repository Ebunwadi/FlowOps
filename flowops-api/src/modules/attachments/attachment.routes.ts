import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { validateRequest } from "../../common/middleware/validateRequest";
import { deleteAttachmentController, downloadAttachmentController } from "./attachment.controller";
import { attachmentParamsSchema } from "./attachment.api.validation";

export const attachmentRouter = Router();

attachmentRouter.use(authenticate, ensureLocalUser);

attachmentRouter.get(
  "/:id/download",
  ensureOrganisationContext,
  validateRequest({ params: attachmentParamsSchema }),
  downloadAttachmentController,
);

attachmentRouter.delete(
  "/:id",
  ensureOrganisationContext,
  validateRequest({ params: attachmentParamsSchema }),
  deleteAttachmentController,
);
