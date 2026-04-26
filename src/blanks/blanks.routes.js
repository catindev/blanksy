const express = require('express');

const blanksService = require('./blanks.service');
const { asyncHandler } = require('../middleware/error-handler');
const {
  createBlankLimiter,
  updateBlankLimiter,
  verifyAccessLimiter,
} = require('../middleware/rate-limits');

const router = express.Router();

function getBearerToken(request) {
  const header = request.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

router.post('/blanks', createBlankLimiter, asyncHandler(async (request, response) => {
  const result = await blanksService.createBlank(request.body || {});
  response.status(201).json(result);
}));

router.get('/blanks/:path', asyncHandler(async (request, response) => {
  const result = await blanksService.getBlankByPath(request.params.path, getBearerToken(request));
  response.json(result);
}));

router.patch('/blanks/:id', updateBlankLimiter, asyncHandler(async (request, response) => {
  const blank = await blanksService.updateBlank(request.params.id, request.body || {}, getBearerToken(request));
  response.json({
    blank: {
      id: blank.id,
      path: blank.path,
      updatedAt: blank.updatedAt,
      title: blank.title,
      signature: blank.signature,
      body: blank.body,
      description: blank.description,
      coverImageUrl: blank.coverImageUrl,
      publishedAt: blank.publishedAt,
    },
  });
}));

router.post('/blanks/:path/access/verify', verifyAccessLimiter, asyncHandler(async (request, response) => {
  const accessToken = request.body?.accessToken;
  const verified = await blanksService.verifyAccess(request.params.path, accessToken);
  response.json({
    ok: true,
    blankId: verified.blankId,
  });
}));

router.post('/blanks/:id/access-tokens', asyncHandler(async (request, response) => {
  const grant = await blanksService.createAdditionalAccessToken(request.params.id, getBearerToken(request));
  response.status(201).json(grant);
}));

module.exports = router;
