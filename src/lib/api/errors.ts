export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401)
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403)
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super("NOT_FOUND", message, 404)
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Validation failed") {
    super("VALIDATION_ERROR", message, 400)
  }
}
