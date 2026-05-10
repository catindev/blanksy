const express = require('express');

const textsService = require('./texts.service');
const { asyncHandler } = require('../middleware/error-handler');
const { optionalAuth, requireAuth } = require('../auth/auth.middleware');
const {
  createTextLimiter,
  updateTextLimiter,
  verifyAccessLimiter,
  additionalAccessTokenLimiter,
} = require('../middleware/rate-limits');

const router = express.Router();

function getBearerToken(request) {
  const header = request.get('authorization') || '';
  const match  = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1];
  // SSO JWT содержит точки; Bytext access token — нет
  return token.includes('.') ? null : token;
}

// ── Texts CRUD ───────────────────────────────────────────────────────────────

router.post('/texts', createTextLimiter, optionalAuth, asyncHandler(async (request, response) => {
  // userId из SSO (если авторизован) — text автоматически привязывается к владельцу
  const result = await textsService.createText(request.body || {}, request.userId);
  response.status(201).json(result);
}));

router.get('/texts/:path', optionalAuth, asyncHandler(async (request, response) => {
  const result = await textsService.getTextByPath(request.params.path, getBearerToken(request));
  response.json(result);
}));

router.patch('/texts/:id', updateTextLimiter, optionalAuth, asyncHandler(async (request, response) => {
  const text = await textsService.updateText(
    request.params.id,
    request.body || {},
    getBearerToken(request),
    request.userId,  // альтернативный доступ через SSO ownership
  );
  response.json({
    text: {
      id:           text.id,
      path:         text.path,
      updatedAt:    text.updatedAt,
      title:        text.title,
      signature:    text.signature,
      body:         text.body,
      description:  text.description,
      coverImageUrl: text.coverImageUrl,
      publishedAt:  text.publishedAt,
    },
  });
}));

// ── Access tokens ─────────────────────────────────────────────────────────────

router.post('/texts/:path/access/verify', verifyAccessLimiter, asyncHandler(async (request, response) => {
  const accessToken = request.body?.accessToken;
  const verified    = await textsService.verifyAccess(request.params.path, accessToken);
  response.json({ ok: true, textId: verified.textId });
}));

router.post('/texts/:id/access-tokens', additionalAccessTokenLimiter, asyncHandler(async (request, response) => {
  const grant = await textsService.createAdditionalAccessToken(request.params.id, getBearerToken(request));
  response.status(201).json(grant);
}));

// ── SSO ownership ─────────────────────────────────────────────────────────────

/**
 * POST /api/texts/:id/link
 * Привязывает text к текущему SSO-пользователю.
 * Требует: валидный access token в Authorization header (доказательство владения)
 *          + валидный SSO JWT (кто привязывает).
 *
 * Используется для привязки уже существующих текстов после первого входа через SSO.
 */
router.post('/texts/:id/link', requireAuth, asyncHandler(async (request, response) => {
  const accessToken = request.body?.accessToken;
  const result = await textsService.linkTextToOwner(
    request.params.id,
    accessToken,
    request.userId,
  );
  response.json(result);
}));

/**
 * GET /api/my/texts
 * Возвращает список текстов текущего SSO-пользователя.
 * Требует авторизацию через SSO JWT.
 */
router.get('/my/texts', requireAuth, asyncHandler(async (request, response) => {
  const texts = await textsService.getTextsByOwner(request.userId);
  response.json({ texts });
}));

module.exports = router;
