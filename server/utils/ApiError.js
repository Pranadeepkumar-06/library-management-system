class ApiError extends Error {
  constructor(statusCode, message, errorCode = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', code = 'BAD_REQUEST', details) {
    return new ApiError(400, msg, code, details);
  }
  static unauthorized(msg = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new ApiError(401, msg, code);
  }
  static forbidden(msg = 'Forbidden', code = 'FORBIDDEN') {
    return new ApiError(403, msg, code);
  }
  static notFound(msg = 'Not found', code = 'NOT_FOUND') {
    return new ApiError(404, msg, code);
  }
  static conflict(msg = 'Conflict', code = 'CONFLICT') {
    return new ApiError(409, msg, code);
  }
  static unprocessable(msg = 'Validation failed', code = 'VALIDATION_ERROR', details) {
    return new ApiError(422, msg, code, details);
  }
}

module.exports = ApiError;
