/**
 * auth.middleware.js — SSO JWT authentication
 *
 * Blanksy поддерживает работу и без авторизации, и с SSO.
 * SSO-сервис выдаёт JWT с payload: { sub, iss, aud, iat, exp }.
 * Blanksy принимает только sub — непрозрачный userId.
 *
 * Конфигурация через env:
 *   AUTH_JWT_PUBLIC_KEY  — публичный ключ RS256 (PEM) для production,
 *                          или shared secret для HS256 в development.
 *                          Если не задан — SSO отключён, userId всегда null.
 *   AUTH_JWT_ISSUER      — ожидаемый issuer (iss). Опционально.
 *   AUTH_JWT_AUDIENCE    — ожидаемый audience (aud). По умолчанию 'blanksy'.
 *
 * ── Algorithm policy ──────────────────────────────────────────────────────────
 * Production (NODE_ENV=production):
 *   Разрешён только RS256. HS256 отклоняется всегда.
 *   Причина: если AUTH_JWT_PUBLIC_KEY содержит RSA public key и middleware
 *   принимает alg из заголовка токена, атакующий может подписать токен
 *   публичным ключом как HMAC secret (algorithm confusion, CVE-2015-9235).
 *
 * Development (NODE_ENV != production):
 *   Разрешены RS256 и HS256. HS256 удобен для локальной разработки
 *   без генерации RSA ключей.
 *
 * ── Token format disambiguation ──────────────────────────────────────────────
 * Blanksy access tokens: base64url без точек (43 символа).
 * JWT: три части через точку — xxx.yyy.zzz.
 * Если Bearer-токен не содержит точек — это access token, не JWT.
 */

const crypto = require('node:crypto');
const { AppError } = require('../middleware/error-handler');

const IS_PRODUCTION  = process.env.NODE_ENV === 'production';
const JWT_AUDIENCE   = process.env.AUTH_JWT_AUDIENCE || 'blanksy';
const ALLOWED_ALGORITHMS = IS_PRODUCTION ? ['RS256'] : ['RS256', 'HS256'];

/**
 * Верифицирует JWT без внешних зависимостей.
 * Поддерживает RS256 (production) и HS256 (dev-only).
 *
 * @throws {Error} если токен невалиден по любой причине
 */
function verifyJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const [headerB64, payloadB64, signatureB64] = parts;

  let header, payload;
  try {
    header  = JSON.parse(Buffer.from(headerB64,  'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('JWT decode failed');
  }

  // ── Algorithm check ──────────────────────────────────────────────────────
  if (!ALLOWED_ALGORITHMS.includes(header.alg)) {
    throw new Error(
      IS_PRODUCTION
        ? `JWT algorithm '${header.alg}' is not allowed in production. Use RS256.`
        : `Unsupported JWT algorithm: ${header.alg}. Allowed: ${ALLOWED_ALGORITHMS.join(', ')}`,
    );
  }

  const publicKey    = process.env.AUTH_JWT_PUBLIC_KEY;
  if (!publicKey) throw new Error('AUTH_JWT_PUBLIC_KEY is not configured');

  const signingInput = `${headerB64}.${payloadB64}`;
  const signature    = Buffer.from(signatureB64, 'base64url');

  if (header.alg === 'RS256') {
    const isValid = crypto.verify(
      'sha256',
      Buffer.from(signingInput),
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      signature,
    );
    if (!isValid) throw new Error('Invalid JWT signature');

  } else if (header.alg === 'HS256') {
    // HS256 только в development — дополнительная защита
    if (IS_PRODUCTION) throw new Error('HS256 is not allowed in production');
    const expected = crypto.createHmac('sha256', publicKey).update(signingInput).digest();
    if (!crypto.timingSafeEqual(expected, signature)) {
      throw new Error('Invalid JWT signature');
    }
  }

  // ── Claims validation ────────────────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('JWT expired');
  if (payload.nbf && payload.nbf > now) throw new Error('JWT not yet valid');

  if (payload.aud) {
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(JWT_AUDIENCE)) {
      throw new Error(`JWT audience mismatch: expected '${JWT_AUDIENCE}'`);
    }
  }

  if (process.env.AUTH_JWT_ISSUER && payload.iss !== process.env.AUTH_JWT_ISSUER) {
    throw new Error(`JWT issuer mismatch: expected '${process.env.AUTH_JWT_ISSUER}'`);
  }

  if (!payload.sub) throw new Error('JWT missing sub claim');

  return payload;
}

/**
 * Извлекает userId из Authorization header.
 * Возвращает null (не бросает) если что-то пошло не так.
 */
function extractUserId(request) {
  if (!process.env.AUTH_JWT_PUBLIC_KEY) return null;

  const header = request.get('authorization') || '';
  const match  = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1];
  if (!token.includes('.')) return null; // Blanksy access token, не JWT

  try {
    const payload = verifyJwt(token);
    return payload.sub || null;
  } catch {
    return null;
  }
}

/** Middleware: опциональная авторизация. Устанавливает request.userId или null. */
function optionalAuth(request, response, next) {
  request.userId = extractUserId(request);
  next();
}

/** Middleware: обязательная авторизация. Возвращает 401 если userId не получен. */
function requireAuth(request, response, next) {
  request.userId = extractUserId(request);
  if (!request.userId) return next(new AppError(401, 'Требуется авторизация'));
  next();
}

module.exports = { optionalAuth, requireAuth, extractUserId };
