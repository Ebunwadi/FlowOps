import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

import { LogOrigin } from "../../common/logging/logFormat";
import { logger } from "../../config/logger";
import { ATTACHMENTS_BUCKET_NAME, getStorageClient } from "../../config/storage";
import {
  StorageObjectNotFoundError,
  StorageOperationError,
} from "./storage.errors";
import type {
  GenerateSignedDownloadUrlOptions,
  UploadFileInput,
} from "./storage.types";

const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 300;

function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? String(error.name) : "";
  const statusCode =
    "$metadata" in error &&
    error.$metadata &&
    typeof error.$metadata === "object" &&
    "httpStatusCode" in error.$metadata
      ? Number(error.$metadata.httpStatusCode)
      : undefined;

  return name === "NoSuchKey" || name === "NotFound" || statusCode === 404;
}

function wrapStorageError(message: string, error: unknown): StorageOperationError {
  if (error instanceof StorageOperationError) {
    return error;
  }

  return new StorageOperationError(message, error);
}

export async function uploadFile(input: UploadFileInput): Promise<void> {
  try {
    await getStorageClient().send(
      new PutObjectCommand({
        Bucket: ATTACHMENTS_BUCKET_NAME,
        Key: input.storageKey,
        Body: input.buffer,
        ContentType: input.mimeType,
        ContentLength: input.buffer.byteLength,
      }),
    );
  } catch (error) {
    logger.error(
      {
        origin: LogOrigin.API,
        event: "storage.upload_failed",
        storageKey: input.storageKey,
        bucket: ATTACHMENTS_BUCKET_NAME,
        error,
      },
      `[API] Failed to upload file to object storage`,
    );

    throw wrapStorageError("Failed to upload file to object storage", error);
  }
}

export async function downloadFile(storageKey: string): Promise<Readable> {
  try {
    const response = await getStorageClient().send(
      new GetObjectCommand({
        Bucket: ATTACHMENTS_BUCKET_NAME,
        Key: storageKey,
      }),
    );

    if (!response.Body) {
      throw new StorageObjectNotFoundError(storageKey);
    }

    return response.Body as Readable;
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      throw error;
    }

    if (isMissingObjectError(error)) {
      throw new StorageObjectNotFoundError(storageKey, error);
    }

    logger.error(
      {
        origin: LogOrigin.API,
        event: "storage.download_failed",
        storageKey,
        bucket: ATTACHMENTS_BUCKET_NAME,
        error,
      },
      `[API] Failed to download file from object storage`,
    );

    throw wrapStorageError("Failed to download file from object storage", error);
  }
}

export async function deleteFile(storageKey: string): Promise<void> {
  try {
    await getStorageClient().send(
      new DeleteObjectCommand({
        Bucket: ATTACHMENTS_BUCKET_NAME,
        Key: storageKey,
      }),
    );
  } catch (error) {
    logger.error(
      {
        origin: LogOrigin.API,
        event: "storage.delete_failed",
        storageKey,
        bucket: ATTACHMENTS_BUCKET_NAME,
        error,
      },
      `[API] Failed to delete file from object storage`,
    );

    throw wrapStorageError("Failed to delete file from object storage", error);
  }
}

export async function generateSignedDownloadUrl(
  storageKey: string,
  options: GenerateSignedDownloadUrlOptions = {},
): Promise<string> {
  const expiresInSeconds =
    options.expiresInSeconds ?? DEFAULT_SIGNED_URL_EXPIRY_SECONDS;

  try {
    const command = new GetObjectCommand({
      Bucket: ATTACHMENTS_BUCKET_NAME,
      Key: storageKey,
    });

    return await getSignedUrl(getStorageClient(), command, {
      expiresIn: expiresInSeconds,
    });
  } catch (error) {
    logger.error(
      {
        origin: LogOrigin.API,
        event: "storage.signed_url_failed",
        storageKey,
        bucket: ATTACHMENTS_BUCKET_NAME,
        error,
      },
      `[API] Failed to generate signed download URL`,
    );

    throw wrapStorageError("Failed to generate signed download URL", error);
  }
}
