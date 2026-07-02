export class StorageOperationError extends Error {
  public constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "StorageOperationError";
  }
}

export class StorageObjectNotFoundError extends StorageOperationError {
  public readonly storageKey: string;

  public constructor(storageKey: string, cause?: unknown) {
    super(`Storage object not found: ${storageKey}`, cause);
    this.name = "StorageObjectNotFoundError";
    this.storageKey = storageKey;
  }
}
