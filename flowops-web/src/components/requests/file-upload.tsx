import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { validateAttachmentFile } from "@/lib/attachment-validation";
import { formatApiErrorMessage } from "@/lib/api-errors";
import {
  ALLOWED_ATTACHMENT_ACCEPT,
  formatAttachmentFileSize,
} from "@/types/attachment";

type UploadState = "idle" | "selected" | "uploading" | "success" | "error";

export function FileUpload({
  disabled = false,
  onUpload,
}: {
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");

  const resetSelection = () => {
    setSelectedFile(null);
    setValidationError(null);
    setUploadError(null);
    setUploadState("idle");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      resetSelection();
      return;
    }

    const error = validateAttachmentFile(file);
    setSelectedFile(file);
    setValidationError(error);
    setUploadError(null);
    setUploadState(error ? "error" : "selected");
  };

  const handleUpload = async () => {
    if (!selectedFile || validationError) {
      return;
    }

    setUploadState("uploading");
    setUploadError(null);

    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      setValidationError(null);
      setUploadError(null);
      setUploadState("success");

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      setUploadState("error");
      setUploadError(formatApiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/20 p-4">
      <input
        accept={ALLOWED_ATTACHMENT_ACCEPT}
        className="hidden"
        disabled={disabled || uploadState === "uploading"}
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={disabled || uploadState === "uploading"}
          onClick={() => {
            inputRef.current?.click();
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          Select file
        </Button>
        <p className="text-xs text-muted-foreground">
          PDF, PNG, JPG, DOCX, XLSX, CSV, or TXT up to 10MB
        </p>
      </div>

      {selectedFile ? (
        <div className="rounded-md border bg-card px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatAttachmentFileSize(selectedFile.size)}
          </p>
        </div>
      ) : null}

      {validationError ? (
        <p className="text-sm text-red-600">{validationError}</p>
      ) : null}

      {uploadError ? (
        <DismissibleAlert
          messageKey={uploadError}
          onDismiss={() => {
            setUploadError(null);
          }}
          variant="error"
        >
          {uploadError}
        </DismissibleAlert>
      ) : null}

      {uploadState === "success" ? (
        <DismissibleAlert
          messageKey="attachment-upload-success"
          onDismiss={() => {
            setUploadState("idle");
          }}
        >
          Attachment uploaded successfully.
        </DismissibleAlert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={
            disabled ||
            !selectedFile ||
            Boolean(validationError) ||
            uploadState === "uploading"
          }
          onClick={() => {
            void handleUpload();
          }}
          size="sm"
          type="button"
        >
          {uploadState === "uploading" ? "Uploading�" : "Upload attachment"}
        </Button>
        {selectedFile ? (
          <Button
            disabled={disabled || uploadState === "uploading"}
            onClick={resetSelection}
            size="sm"
            type="button"
            variant="ghost"
          >
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
