import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";

type RequestPart = "body" | "params" | "query";

type ValidationSchemas = Partial<Record<RequestPart, ZodTypeAny>>;

export function validateRequest(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const [part, schema] of Object.entries(schemas) as [RequestPart, ZodTypeAny][]) {
      const parsed = schema.parse(req[part]);
      req[part] = parsed;
    }

    next();
  };
}
