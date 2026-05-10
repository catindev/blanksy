const rateLimit = require('express-rate-limit');

function effectiveMax(max) {
  // Keep strict abuse limits in production, but make local/e2e runs repeatable.
  // A full desktop+mobile suite creates more than 20 texts from 127.0.0.1,
  // so production-like limits in development turn tests into rate-limit tests.
  return process.env.NODE_ENV === 'production' ? max : 10000;
}

function createLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    max: effectiveMax(max),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: 'Too many requests',
      },
    },
  });
}

const createTextLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 20 });
const updateTextLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 120 });
const reportTextLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
const verifyAccessLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 60 });
const additionalAccessTokenLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 20 });

module.exports = {
  createTextLimiter,
  updateTextLimiter,
  reportTextLimiter,
  verifyAccessLimiter,
  additionalAccessTokenLimiter,
};
