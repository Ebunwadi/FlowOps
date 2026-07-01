export class EmailDeliveryError extends Error {
  public constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "EmailDeliveryError";
  }
}
