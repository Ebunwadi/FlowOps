import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

import { env } from "./env";

let storageClient: S3Client | null = null;

export function getStorageClientConfig(): S3ClientConfig {
  return {
    region: env.storageRegion,
    endpoint: env.storageEndpoint,
    forcePathStyle: env.storageForcePathStyle,
    credentials: {
      accessKeyId: env.storageAccessKey,
      secretAccessKey: env.storageSecretKey,
    },
  };
}

export function getStorageClient(): S3Client {
  if (!storageClient) {
    storageClient = new S3Client(getStorageClientConfig());
  }

  return storageClient;
}

function isMissingBucketError(error: unknown): boolean {
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

  return name === "NotFound" || name === "NoSuchBucket" || statusCode === 404;
}

export async function ensureAttachmentsBucket(
  client: S3Client = getStorageClient(),
): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: env.storageBucket }));
  } catch (error) {
    if (!isMissingBucketError(error)) {
      throw error;
    }

    await client.send(new CreateBucketCommand({ Bucket: env.storageBucket }));
  }
}

export async function checkStorageConnection(
  client: S3Client = getStorageClient(),
): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: env.storageBucket }));
    return true;
  } catch {
    return false;
  }
}

export function resetStorageClientForTests(): void {
  storageClient = null;
}
