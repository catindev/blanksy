const textsRepository = require('./texts.repository');
const { validateTextInput } = require('./text.schema');
const { buildTextDescription, findCoverImageUrl } = require('./text.description');
const { createPathBase } = require('./text.path');
const accessService = require('../access/access.service');
const { AppError } = require('../middleware/error-handler');

const MAX_ACTIVE_ACCESS_TOKENS_PER_TEXT = 25;

function getPublicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
}

async function createUniquePath(title) {
  const base = createPathBase(title, new Date());
  let candidate = base;
  let suffix = 2;

  while (await textsRepository.isPathTaken(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function addOneYear(date = new Date()) {
  const copy = new Date(date);
  copy.setUTCFullYear(copy.getUTCFullYear() + 1);
  return copy;
}

/**
 * Создаёт новый text.
 * @param {object} payload
 * @param {string|null} userId — userId из SSO JWT. Если задан:
 *   - text автоматически привязывается к пользователю (атомарно в одной транзакции)
 *   - expires_at устанавливается в null (owned text не истекает)
 */
async function createText(payload, userId = null) {
  const textInput    = validateTextInput(payload);
  const description   = buildTextDescription(textInput.body);
  const coverImageUrl = findCoverImageUrl(textInput.body);
  let lastError;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const path = attempt === 0
      ? await createUniquePath(textInput.title)
      : `${createPathBase(textInput.title, new Date())}-${Date.now().toString(36)}-${attempt}`;
    const accessToken = accessService.generateAccessToken();
    const tokenHash   = accessService.hashAccessToken(accessToken);

    try {
      const text = await textsRepository.createTextWithAccessToken({
        path,
        title:      textInput.title,
        signature:  textInput.signature,
        body:       textInput.body,
        description,
        coverImageUrl,
        // SSO-owned тексты не истекают. Anonymous тексты истекают через год.
        expiresAt:  userId ? null : addOneYear(),
        // userId передаётся в транзакцию чтобы text_owners создался атомарно.
        userId,
      }, tokenHash);

      return {
        text: {
          id:        text.id,
          path:      text.path,
          title:     text.title,
          signature: text.signature,
          expiresAt: text.expiresAt,
          publicUrl: `${getPublicBaseUrl()}/${text.path}`,
        },
        accessToken,
        accessUrl: `${getPublicBaseUrl()}/${text.path}?access=${encodeURIComponent(accessToken)}`,
      };
    } catch (error) {
      lastError = error;
      if (error.code !== '23505') throw error;
    }
  }

  throw lastError;
}

async function getTextByPath(path, rawToken = null) {
  const text = await textsRepository.getTextByPath(path);
  if (!text) throw new AppError(404, 'Text not found');

  const canEdit = rawToken ? await accessService.verifyAccessForText(text.id, rawToken) : false;
  return { text, canEdit };
}

async function getTextForPage(path) {
  const text = await textsRepository.getTextByPath(path);
  if (!text) throw new AppError(404, 'Text not found');
  return text;
}

/**
 * Обновляет text.
 * Доступ проверяется через access token ИЛИ через ownership (userId из SSO).
 */
async function updateText(textId, payload, rawToken, userId = null) {
  const existingText = await textsRepository.getTextById(textId);
  if (!existingText) throw new AppError(404, 'Text not found');

  // Проверяем доступ: access token ИЛИ ownership через SSO
  const hasToken     = rawToken && await accessService.verifyAccessForText(textId, rawToken);
  const hasOwnership = userId  && await textsRepository.isTextOwnedByUser(textId, userId);

  if (!hasToken && !hasOwnership) {
    throw new AppError(403, 'Access token is invalid');
  }

  const textInput    = validateTextInput(payload);
  const description   = buildTextDescription(textInput.body);
  const coverImageUrl = findCoverImageUrl(textInput.body);

  return textsRepository.updateTextWithVersion(existingText, {
    title:      textInput.title,
    signature:  textInput.signature,
    body:       textInput.body,
    description,
    coverImageUrl,
  });
}

async function verifyAccess(path, rawToken) {
  const verified = await accessService.verifyAccessForPath(path, rawToken);
  if (!verified) throw new AppError(403, 'Access token is invalid');
  return verified;
}

async function createAdditionalAccessToken(textId, rawToken) {
  const text = await textsRepository.getTextById(textId);
  if (!text) throw new AppError(404, 'Text not found');

  await accessService.requireAccess(textId, rawToken);
  return accessService.issueAccessToken(textId, text.path, 'extra', {
    maxActiveTokens: MAX_ACTIVE_ACCESS_TOKENS_PER_TEXT,
  });
}

/**
 * Привязывает существующий text к userId из SSO.
 * Требует валидный access token как доказательство владения.
 */
async function linkTextToOwner(textId, rawToken, userId) {
  const text = await textsRepository.getTextById(textId);
  if (!text) throw new AppError(404, 'Text not found');

  await accessService.requireAccess(textId, rawToken);
  await textsRepository.linkTextToOwner(textId, userId);

  return { ok: true, textId, userId };
}

/**
 * Возвращает список текстов привязанных к userId.
 */
async function getTextsByOwner(userId) {
  return textsRepository.getTextsByOwner(userId);
}

module.exports = {
  createText,
  getTextByPath,
  getTextForPage,
  updateText,
  verifyAccess,
  createAdditionalAccessToken,
  linkTextToOwner,
  getTextsByOwner,
  MAX_ACTIVE_ACCESS_TOKENS_PER_TEXT,
};
