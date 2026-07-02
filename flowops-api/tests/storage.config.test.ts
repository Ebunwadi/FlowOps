import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  checkStorageConnection,
  ensureAttachmentsBucket,
  getStorageClientConfig,
  resetStorageClientForTests,
} from "../src/config/storage";

jest.mock("@aws-sdk/client-s3", () => {
  const sendMock = jest.fn();

  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
    HeadBucketCommand: jest.fn().mockImplementation((input) => ({ input })),
    CreateBucketCommand: jest.fn().mockImplementation((input) => ({ input })),
    __sendMock: sendMock,
  };
});

const { __sendMock: sendMock } = jest.requireMock("@aws-sdk/client-s3") as {
  __sendMock: jest.Mock;
};

describe("storage configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStorageClientForTests();
  });

  it("builds an S3-compatible client config from environment defaults", () => {
    expect(getStorageClientConfig()).toMatchObject({
      region: "us-east-1",
      endpoint: "http://localhost:9000",
      credentials: {
        accessKeyId: "minioadmin",
        secretAccessKey: "minioadmin",
      },
    });
    expect(typeof getStorageClientConfig().forcePathStyle).toBe("boolean");
  });

  it("creates the attachments bucket when it does not exist", async () => {
    sendMock
      .mockRejectedValueOnce({ name: "NotFound", $metadata: { httpStatusCode: 404 } })
      .mockResolvedValueOnce({});

    await ensureAttachmentsBucket(new S3Client({}));

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(CreateBucketCommand).toHaveBeenCalledWith({
      Bucket: "flowops-attachments",
    });
  });

  it("reports storage as connected when the bucket is reachable", async () => {
    sendMock.mockResolvedValueOnce({});

    await expect(checkStorageConnection(new S3Client({}))).resolves.toBe(true);
    expect(HeadBucketCommand).toHaveBeenCalledWith({
      Bucket: "flowops-attachments",
    });
  });

  it("reports storage as disconnected when the bucket check fails", async () => {
    sendMock.mockRejectedValueOnce(new Error("connection refused"));

    await expect(checkStorageConnection(new S3Client({}))).resolves.toBe(false);
  });
});
