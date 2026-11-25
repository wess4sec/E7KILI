class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class ApiException extends ApiError {}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, 'NOT_FOUND', 'Route not found'));
}

function createErrorHandler(logger) {
  return (error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    let statusCode = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';

    if (error instanceof ApiError) {
      ({ statusCode, code, message } = error);
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      code = 'INVALID_INPUT';
      message = 'Request data is invalid';
    } else if (error.code === 11000) {
      statusCode = 409;
      code = 'RESOURCE_CONFLICT';
      message = 'A resource with these values already exists';
    } else if (error.type === 'entity.parse.failed') {
      statusCode = 400;
      code = 'INVALID_JSON';
      message = 'Request body must contain valid JSON';
    } else if (error.type === 'entity.too.large') {
      statusCode = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Request body is too large';
    }

    logger.error(
      { errorType: error.name, statusCode },
      'request failed',
    );

    res.status(statusCode).json({
      error: { code, message },
    });
  };
}

module.exports = {
  ApiError,
  ApiException,
  createErrorHandler,
  notFoundHandler,
};
