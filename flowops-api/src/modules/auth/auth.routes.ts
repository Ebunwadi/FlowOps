import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { getCurrentUserController } from "./auth.controller";

export const authRouter = Router();

authRouter.get("/me", authenticate, ensureLocalUser, getCurrentUserController);
