import { ExternalServiceError } from "../../common/errors/httpErrors";

export class AiGenerationError extends ExternalServiceError {
  public constructor(message = "Failed to generate AI workflow suggestion") {
    super(message);
  }
}
