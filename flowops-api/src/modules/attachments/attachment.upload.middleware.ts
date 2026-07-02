import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { ValidationError } from "../../common/errors/httpErrors";
import { MAX_ATTACHMENT_FILE_SIZE_BYTES } from "./attachment.validation";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_FILE_SIZE_BYTES,
    files: 1,
  },
});

function mapMulterError(error: multer.MulterError): ValidationError {
  if (error.code === "LIMIT_FILE_SIZE") {
    return new ValidationError("Attachment upload is invalid", [
      {
        field: "file",
        message: "File size must not exceed 10MB",
      },
    ]);
  }

  return new ValidationError("Attachment upload is invalid", [
    {
      field: "file",
      message: error.message,
    },
  ]);
}

export function uploadAttachmentFileMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(mapMulterError(error));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
}
