const express = require('express');

const blanksService = require('./blanks.service');
const { asyncHandler } = require('../middleware/error-handler');
const { optionalAuth, requireAuth } = require('../auth/auth.middleware');
const {
  createBlankLimiter,
  updateBlankLimiter,
  verifyAccessLimiter,
  additionalAccessTokenLimiter,
} = require('../middleware/rate-limits');

const router = express.Router();

function getBearerToken(request) {
  const header = request.get('authorization') || '';
  const match  = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1];
  // SSO JWT содержит точки; Blanksy access token — нет
  return token.includes('.') ? null : token;
}

// ── Blanks CRUD ───────────────────────────────────────────────────────────────

router.post('/blanks', createBlankLimiter, optionalAuth, asyncHandler(async (request, response) => {
  // userId из SSO (если авторизован) — blank автоматически привязывается к владельцу
  const result = await blanksService.createBlank(request.body || {}, request.userId);
  response.status(201).json(result);
}));

router.get('/blanks/:path', optionalAuth, asyncHandler(async (request, response) => {
  const result = await blanksService.getBlankByPath(request.params.path, getBearerToken(request));
  response.json(result);
}));

router.patch('/blanks/:id', updateBlankLimiter, optionalAuth, asyncHandler(async (request, response) => {
  const blank = await blanksService.updateBlank(
    request.params.id,
    request.body || {},
    getBearerToken(request),
    request.userId,  // альтернативный доступ через SSO ownership
  );
  response.json({
    blank: {
      id:           blank.id,
      path:         blank.path,
      updatedAt:    blank.updatedAt,
      title:        blank.title,
      signature:    blank.signature,
      body:         blank.body,
      description:  blank.description,
      coverImageUrl: blank.coverImageUrl,
      publishedAt:  blank.publishedAt,
    },
  });
}));

// ── Access tokens ─────────────────────────────────────────────────────────────

router.post('/blanks/:path/access/verify', verifyAccessLimiter, asyncHandler(async (request, response) => {
  const accessToken = request.body?.accessToken;
  const verified    = await blanksService.verifyAccess(request.params.path, accessToken);
  response.json({ ok: true, blankId: verified.blankId });
}));

router.post('/blanks/:id/access-tokens', additionalAccessTokenLimiter, asyncHandler(async (request, response) => {
  const grant = await blanksService.createAdditionalAccessToken(request.params.id, getBearerToken(request));
  response.status(201).json(grant);
}));

// ── SSO ownership ─────────────────────────────────────────────────────────────

/**
 * POST /api/blanks/:id/link
 * Привязывает blank к текущему SSO-пользователю.
 * Требует: валидный access token в Authorization header (доказательство владения)
 *          + валидный SSO JWT (кто привязывает).
 *
 * Используется для привязки уже существующих blanks после первого входа через SSO.
 */
router.post('/blanks/:id/link', requireAuth, asyncHandler(async (request, response) => {
  const accessToken = request.body?.accessToken;
  const result = await blanksService.linkBlankToOwner(
    request.params.id,
    accessToken,
    request.userId,
  );
  response.json(result);
}));

/**
 * GET /api/my/blanks
 * Возвращает список blanks текущего SSO-пользователя.
 * Требует авторизацию через SSO JWT.
 */
router.get('/my/blanks', requireAuth, asyncHandler(async (request, response) => {
  const blanks = await blanksService.getBlanksByOwner(request.userId);
  response.json({ blanks });
}));

module.exports = router;
