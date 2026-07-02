import { ValidationError } from "../src/common/errors/httpErrors";
import {
  MAX_ATTACHMENT_FILE_SIZE_BYTES,
  validateAttachmentUpload,
} from "../src/modules/attachments/attachment.validation";

describe("attachment upload validation", () => {
  it("accepts a valid PDF upload", () => {
    const buffer = Buffer.from("sample pdf content");

    expect(
      validateAttachmentUpload({
        originalFileName: "report.pdf",
        buffer,
        mimeType: "application/pdf",
      }),
    ).toEqual({
      originalFileName: "report.pdf",
      buffer,
      mimeType: "application/pdf",
      fileSize: buffer.byteLength,
      fileExtension: "pdf",
    });
  });

  it("accepts JPEG uploads with a .jpg extension", () => {
    const buffer = Buffer.from("jpeg bytes");

    expect(
      validateAttachmentUpload({
        originalFileName: "photo.JPG",
        buffer,
        mimeType: "image/jpeg",
      }).fileExtension,
    ).toBe("jpg");
  });

  it("rejects missing files", () => {
    expect(() =>
      validateAttachmentUpload({
        originalFileName: "report.pdf",
        buffer: null,
        mimeType: "application/pdf",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects empty file names", () => {
    expect(() =>
      validateAttachmentUpload({
        originalFileName: "   ",
        buffer: Buffer.from("content"),
        mimeType: "application/pdf",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects oversized files", () => {
    const buffer = Buffer.alloc(MAX_ATTACHMENT_FILE_SIZE_BYTES + 1);

    try {
      validateAttachmentUpload({
        originalFileName: "large.pdf",
        buffer,
        mimeType: "application/pdf",
      });
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "file",
            message: "File size must not exceed 10MB",
          }),
        ]),
      );
    }
  });

  it("rejects unsupported mime types", () => {
    expect(() =>
      validateAttachmentUpload({
        originalFileName: "script.exe",
        buffer: Buffer.from("binary"),
        mimeType: "application/x-msdownload",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects unsupported file extensions", () => {
    expect(() =>
      validateAttachmentUpload({
        originalFileName: "script.exe",
        buffer: Buffer.from("binary"),
        mimeType: "application/pdf",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects files whose extension does not match the mime type", () => {
    expect(() =>
      validateAttachmentUpload({
        originalFileName: "report.pdf",
        buffer: Buffer.from("content"),
        mimeType: "image/png",
      }),
    ).toThrow(ValidationError);
  });

  it("normalises mime types with parameters", () => {
    const buffer = Buffer.from("plain text");

    expect(
      validateAttachmentUpload({
        originalFileName: "notes.txt",
        buffer,
        mimeType: "text/plain; charset=utf-8",
      }).mimeType,
    ).toBe("text/plain");
  });
});
