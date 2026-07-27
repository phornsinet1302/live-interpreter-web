export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string,
    // When true, error.middleware responds with the bare `{ message }` shape
    // instead of this app's usual `{ error: { message, code } }` envelope —
    // for endpoints whose response contract was specified externally.
    public flat = false
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message = "Bad request") {
    return new ApiError(400, message, "BAD_REQUEST");
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message, "UNAUTHORIZED");
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message, "FORBIDDEN");
  }

  static notFound(message = "Not found") {
    return new ApiError(404, message, "NOT_FOUND");
  }

  static conflict(message = "Conflict") {
    return new ApiError(409, message, "CONFLICT");
  }

  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, message, "TOO_MANY_REQUESTS");
  }

  /** Bare `{ message }` response body, for externally-specified contracts. */
  static flat(statusCode: number, message: string) {
    return new ApiError(statusCode, message, "FLAT", true);
  }
}
