import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";

export const requestId: RequestHandler = (req, res, next) => {
  const incomingRequestId = req.header("x-request-id");
  const id = incomingRequestId?.trim() || randomUUID();

  res.locals.requestId = id;
  res.setHeader("x-request-id", id);
  next();
};
