const express = require('express');

const reportsService = require('./reports.service');
const { asyncHandler } = require('../middleware/error-handler');
const { reportTextLimiter } = require('../middleware/rate-limits');

const router = express.Router();

router.post('/texts/:id/reports', reportTextLimiter, asyncHandler(async (request, response) => {
  await reportsService.createReport(request.params.id, request.body || {}, {
    ip: request.ip,
    userAgent: request.get('user-agent') || '',
  });

  response.json({ ok: true });
}));

module.exports = router;
