import { ApiClientError } from "@/types/api";

export function formatApiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.fieldErrors.length > 0) {
      return error.fieldErrors.map((fieldError) => fieldError.message).join(" ");
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
