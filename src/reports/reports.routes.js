const express = require('express');

const reportsService = require('./reports.service');
const { asyncHandler } = require('../middleware/error-handler');
const { reportBlankLimiter } = require('../middleware/rate-limits');

const router = express.Router();

router.post('/blanks/:id/reports', reportBlankLimiter, asyncHandler(async (request, response) => {
  await reportsService.createReport(request.params.id, request.body || {}, {
    ip: request.ip,
    userAgent: request.get('user-agent') || '',
  });

  response.json({ ok: true });
}));

module.exports = router;
