import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { getMeController } from "./me.controller";

export const meRouter = Router();

meRouter.get("/", authenticate, getMeController);
