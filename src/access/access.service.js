const crypto = require('node:crypto');

const textsRepository = require('../texts/texts.repository');
const { AppError } = require('../middleware/error-handler');

function generateAccessToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashAccessToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function getPublicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
}

async function issueAccessToken(textId, path, label = null, options = {}) {
  const accessToken = generateAccessToken();
  const tokenHash = hashAccessToken(accessToken);

  if (options.maxActiveTokens) {
    const created = await textsRepository.createAccessTokenWithLimit(
      textId,
      tokenHash,
      label,
      options.maxActiveTokens,
    );

    if (!created) {
      throw new AppError(409, 'Too many active access tokens for this text');
    }
  } else {
    await textsRepository.createAccessToken(textId, tokenHash, label);
  }

  return {
    accessToken,
    accessUrl: `${getPublicBaseUrl()}/${path}?access=${encodeURIComponent(accessToken)}`,
  };
}

async function verifyAccessForPath(path, rawToken) {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashAccessToken(rawToken);
  const match = await textsRepository.getTextByPathAndTokenHash(path, tokenHash);
  if (!match) {
    return null;
  }

  await textsRepository.touchAccessToken(match.access_token_id);
  return {
    textId: match.id,
    path: match.path,
  };
}

async function verifyAccessForText(textId, rawToken) {
  if (!rawToken) {
    return false;
  }

  const tokenHash = hashAccessToken(rawToken);
  const token = await textsRepository.getAccessTokenByTextIdAndHash(textId, tokenHash);
  if (!token) {
    return false;
  }

  await textsRepository.touchAccessToken(token.id);
  return true;
}

async function requireAccess(textId, rawToken) {
  if (!rawToken) {
    throw new AppError(401, 'Access token is required');
  }

  const isValid = await verifyAccessForText(textId, rawToken);
  if (!isValid) {
    throw new AppError(403, 'Access token is invalid');
  }
}

module.exports = {
  generateAccessToken,
  hashAccessToken,
  issueAccessToken,
  verifyAccessForPath,
  verifyAccessForText,
  requireAccess,
};
