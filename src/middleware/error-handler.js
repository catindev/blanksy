class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function redactUrlSecrets(input) {
  const rawUrl = String(input || '');
  try {
    const url = new URL(rawUrl, 'http://blanksy.local');
    if (url.searchParams.has('access')) {
      url.searchParams.set('access', '[redacted]');
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return rawUrl.replace(/([?&]access=)[^&]+/gi, '$1[redacted]');
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
    // Логируем полную ошибку только на сервере.
    console.error('[error]', request.method, redactUrlSecrets(request.originalUrl || request.url), error);
  }

  // Для 5xx клиент получает только generic-сообщение — внутренние детали не раскрываем.
  const clientMessage = statusCode >= 500
    ? 'Internal server error'
    : (error.message || 'Internal server error');

  response.status(statusCode).json({
    error: {
      message: clientMessage,
      details: statusCode < 500 ? (error.details || null) : null,
    },
  });
}

module.exports = {
  AppError,
  asyncHandler,
  notFoundHandler,
  errorHandler,
  redactUrlSecrets,
};
