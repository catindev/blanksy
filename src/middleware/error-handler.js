class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function asyncHandler(handler) {
  return async function wrappedHandler(request, response, next) {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

function notFoundHandler(request, response, next) {
  next(new AppError(404, 'Not found'));
}

function errorHandler(error, request, response, next) { // eslint-disable-line no-unused-vars
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({
    error: {
      message: error.message || 'Internal server error',
      details: error.details || null,
    },
  });
}

module.exports = {
  AppError,
  asyncHandler,
  notFoundHandler,
  errorHandler,
};
