const crypto = require('node:crypto');

const blanksRepository = require('../blanks/blanks.repository');
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

async function issueAccessToken(blankId, path, label = null, options = {}) {
  const accessToken = generateAccessToken();
  const tokenHash = hashAccessToken(accessToken);

  if (options.maxActiveTokens) {
    const created = await blanksRepository.createAccessTokenWithLimit(
      blankId,
      tokenHash,
      label,
      options.maxActiveTokens,
    );

    if (!created) {
      throw new AppError(409, 'Too many active access tokens for this blank');
    }
  } else {
    await blanksRepository.createAccessToken(blankId, tokenHash, label);
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
  const match = await blanksRepository.getBlankByPathAndTokenHash(path, tokenHash);
  if (!match) {
    return null;
  }

  await blanksRepository.touchAccessToken(match.access_token_id);
  return {
    blankId: match.id,
    path: match.path,
  };
}

async function verifyAccessForBlank(blankId, rawToken) {
  if (!rawToken) {
    return false;
  }

  const tokenHash = hashAccessToken(rawToken);
  const token = await blanksRepository.getAccessTokenByBlankIdAndHash(blankId, tokenHash);
  if (!token) {
    return false;
  }

  await blanksRepository.touchAccessToken(token.id);
  return true;
}

async function requireAccess(blankId, rawToken) {
  if (!rawToken) {
    throw new AppError(401, 'Access token is required');
  }

  const isValid = await verifyAccessForBlank(blankId, rawToken);
  if (!isValid) {
    throw new AppError(403, 'Access token is invalid');
  }
}

module.exports = {
  generateAccessToken,
  hashAccessToken,
  issueAccessToken,
  verifyAccessForPath,
  verifyAccessForBlank,
  requireAccess,
};
