import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AnyZodObject } from "zod";

type RequestPart = "body" | "params" | "query";

type ValidationSchemas = Partial<Record<RequestPart, AnyZodObject>>;

export function validateRequest(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const [part, schema] of Object.entries(schemas) as [RequestPart, AnyZodObject][]) {
      const parsed = schema.parse(req[part]);
      req[part] = parsed;
    }

    next();
  };
}
