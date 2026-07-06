import { Readable } from "node:stream";

import { logger } from "../src/config/logger";
import {
  StorageObjectNotFoundError,
  StorageOperationError,
} from "../src/modules/storage/storage.errors";
import {
  deleteFile,
  downloadFile,
  generateSignedDownloadUrl,
  uploadFile,
} from "../src/modules/storage/storage.service";

const sendMock = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

jest.mock("../src/config/storage", () => ({
  ATTACHMENTS_BUCKET_NAME: "flowops-attachments",
  getStorageClient: jest.fn(() => ({ send: sendMock })),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock("../src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

describe("storage service", () => {
  const storageKey =
    "organisations/org-1/requests/req-1/attachments/file-1-report.pdf";
  const fileBuffer = Buffer.from("sample attachment content");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploads a file to the configured bucket", async () => {
    sendMock.mockResolvedValueOnce({});

    await expect(
      uploadFile({
        buffer: fileBuffer,
        storageKey,
        mimeType: "application/pdf",
      }),
    ).resolves.toBeUndefined();

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "flowops-attachments",
      Key: storageKey,
      Body: fileBuffer,
      ContentType: "application/pdf",
      ContentLength: fileBuffer.byteLength,
    });
  });

  it("wraps upload failures in StorageOperationError", async () => {
    sendMock.mockRejectedValueOnce(new Error("upload failed"));

    await expect(
      uploadFile({
        buffer: fileBuffer,
        storageKey,
        mimeType: "application/pdf",
      }),
    ).rejects.toBeInstanceOf(StorageOperationError);

    expect(logger.error).toHaveBeenCalled();
  });

  it("downloads a file stream from object storage", async () => {
    const body = Readable.from(["file-content"]);
    sendMock.mockResolvedValueOnce({ Body: body });

    await expect(downloadFile(storageKey)).resolves.toBe(body);
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: "flowops-attachments",
      Key: storageKey,
    });
  });

  it("throws StorageObjectNotFoundError when the object is missing", async () => {
    sendMock.mockRejectedValueOnce({
      name: "NoSuchKey",
      $metadata: { httpStatusCode: 404 },
    });

    await expect(downloadFile(storageKey)).rejects.toBeInstanceOf(
      StorageObjectNotFoundError,
    );
  });

  it("deletes a file from object storage", async () => {
    sendMock.mockResolvedValueOnce({});

    await expect(deleteFile(storageKey)).resolves.toBeUndefined();
    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: "flowops-attachments",
      Key: storageKey,
    });
  });

  it("generates a signed download URL", async () => {
    jest
      .mocked(getSignedUrl)
      .mockResolvedValueOnce("https://minio.local/signed-url");

    await expect(generateSignedDownloadUrl(storageKey)).resolves.toBe(
      "https://minio.local/signed-url",
    );

    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: "flowops-attachments",
      Key: storageKey,
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ input: expect.objectContaining({ Key: storageKey }) }),
      { expiresIn: 300 },
    );
  });
});
