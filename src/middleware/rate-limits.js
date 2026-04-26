const rateLimit = require('express-rate-limit');

function createLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: 'Too many requests',
      },
    },
  });
}

const createBlankLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 20 });
const updateBlankLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 120 });
const reportBlankLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
const verifyAccessLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 60 });

module.exports = {
  createBlankLimiter,
  updateBlankLimiter,
  reportBlankLimiter,
  verifyAccessLimiter,
};
