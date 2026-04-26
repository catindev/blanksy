const blanksRepository = require('./blanks.repository');
const { validateBlankInput } = require('./blank.schema');
const { buildBlankDescription, findCoverImageUrl } = require('./blank.description');
const { createPathBase } = require('./blank.path');
const accessService = require('../access/access.service');
const { AppError } = require('../middleware/error-handler');

const MAX_ACTIVE_ACCESS_TOKENS_PER_BLANK = 25;

function getPublicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
}

async function createUniquePath(title) {
  const base = createPathBase(title, new Date());
  let candidate = base;
  let suffix = 2;

  while (await blanksRepository.isPathTaken(candidate)) {
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

async function createBlank(payload) {
  const blankInput = validateBlankInput(payload);
  const description = buildBlankDescription(blankInput.body);
  const coverImageUrl = findCoverImageUrl(blankInput.body);
  let lastError;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const path = attempt === 0
      ? await createUniquePath(blankInput.title)
      : `${createPathBase(blankInput.title, new Date())}-${Date.now().toString(36)}-${attempt}`;
    const accessToken = accessService.generateAccessToken();
    const tokenHash = accessService.hashAccessToken(accessToken);

    try {
      const blank = await blanksRepository.createBlankWithAccessToken({
        path,
        title: blankInput.title,
        signature: blankInput.signature,
        body: blankInput.body,
        description,
        coverImageUrl,
        expiresAt: addOneYear(),
      }, tokenHash);

      return {
        blank: {
          id: blank.id,
          path: blank.path,
          title: blank.title,
          signature: blank.signature,
          expiresAt: blank.expiresAt,
          publicUrl: `${getPublicBaseUrl()}/${blank.path}`,
        },
        accessToken,
        accessUrl: `${getPublicBaseUrl()}/${blank.path}?access=${encodeURIComponent(accessToken)}`,
      };
    } catch (error) {
      lastError = error;
      if (error.code !== '23505') {
        throw error;
      }
    }
  }

  throw lastError;
}

async function getBlankByPath(path, rawToken = null) {
  const blank = await blanksRepository.getBlankByPath(path);
  if (!blank) {
    throw new AppError(404, 'Blank not found');
  }

  const canEdit = rawToken ? await accessService.verifyAccessForBlank(blank.id, rawToken) : false;
  return {
    blank,
    canEdit,
  };
}

async function getBlankForPage(path) {
  const blank = await blanksRepository.getBlankByPath(path);
  if (!blank) {
    throw new AppError(404, 'Blank not found');
  }

  return blank;
}

async function updateBlank(blankId, payload, rawToken) {
  const existingBlank = await blanksRepository.getBlankById(blankId);
  if (!existingBlank) {
    throw new AppError(404, 'Blank not found');
  }

  await accessService.requireAccess(blankId, rawToken);

  const blankInput = validateBlankInput(payload);
  const description = buildBlankDescription(blankInput.body);
  const coverImageUrl = findCoverImageUrl(blankInput.body);

  return blanksRepository.updateBlankWithVersion(existingBlank, {
    title: blankInput.title,
    signature: blankInput.signature,
    body: blankInput.body,
    description,
    coverImageUrl,
  });
}

async function verifyAccess(path, rawToken) {
  const verified = await accessService.verifyAccessForPath(path, rawToken);
  if (!verified) {
    throw new AppError(403, 'Access token is invalid');
  }

  return verified;
}

async function createAdditionalAccessToken(blankId, rawToken) {
  const blank = await blanksRepository.getBlankById(blankId);
  if (!blank) {
    throw new AppError(404, 'Blank not found');
  }

  await accessService.requireAccess(blankId, rawToken);
  return accessService.issueAccessToken(blankId, blank.path, 'extra', {
    maxActiveTokens: MAX_ACTIVE_ACCESS_TOKENS_PER_BLANK,
  });
}

module.exports = {
  createBlank,
  getBlankByPath,
  getBlankForPage,
  updateBlank,
  verifyAccess,
  createAdditionalAccessToken,
  MAX_ACTIVE_ACCESS_TOKENS_PER_BLANK,
};
