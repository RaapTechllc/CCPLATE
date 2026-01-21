export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public statusCode?: number
  ) {
    super(message);
    this.name = "AIError";
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof AIError) {
    return error.retryable;
  }

  if (error instanceof Error) {
    const statusCode = (error as { status?: number }).status;
    if (statusCode === 429) return true;
    if (statusCode && statusCode >= 500 && statusCode < 600) return true;
  }

  return false;
}

export function mapProviderError(error: unknown, provider: string): AIError {
  if (error instanceof AIError) {
    return error;
  }

  const err = error as { status?: number; message?: string; code?: string };
  const statusCode = err.status;
  const message = err.message || "Unknown AI error";
  const code = err.code || "UNKNOWN_ERROR";

  let retryable = false;
  if (statusCode === 429) {
    retryable = true;
  } else if (statusCode && statusCode >= 500) {
    retryable = true;
  }

  return new AIError(
    `[${provider}] ${message}`,
    code,
    retryable,
    statusCode
  );
}
