import type { Request, Response } from "express";

import { sendSuccess } from "../../common/http/apiResponse";
import { getHealth } from "./health.service";

export function getHealthController(_req: Request, res: Response): void {
  sendSuccess(res, {
    data: getHealth(),
    message: "Service is healthy"
  });
}
