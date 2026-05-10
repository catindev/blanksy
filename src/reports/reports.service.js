const crypto = require('node:crypto');

const textsRepository = require('../texts/texts.repository');
const { AppError } = require('../middleware/error-handler');

const REPORT_REASONS = new Set([
  'violence',
  'child_abuse',
  'copyright',
  'illegal_goods',
  'personal_details',
  'spam',
  'other',
]);

function hashIpAddress(ipAddress) {
  if (!ipAddress) {
    return null;
  }

  return crypto.createHash('sha256').update(ipAddress).digest('hex');
}

async function createReport(textId, { reason, comment }, requestMeta) {
  if (!REPORT_REASONS.has(reason)) {
    throw new AppError(400, 'Invalid report reason');
  }

  const text = await textsRepository.getTextById(textId);
  if (!text) {
    throw new AppError(404, 'Text not found');
  }

  await textsRepository.createReport({
    textId,
    reason,
    comment: comment || '',
    ipHash: hashIpAddress(requestMeta.ip),
    userAgent: requestMeta.userAgent,
  });
}

module.exports = {
  createReport,
};
