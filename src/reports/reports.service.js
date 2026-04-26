const crypto = require('node:crypto');

const blanksRepository = require('../blanks/blanks.repository');
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

async function createReport(blankId, { reason, comment }, requestMeta) {
  if (!REPORT_REASONS.has(reason)) {
    throw new AppError(400, 'Invalid report reason');
  }

  const blank = await blanksRepository.getBlankById(blankId);
  if (!blank) {
    throw new AppError(404, 'Blank not found');
  }

  await blanksRepository.createReport({
    blankId,
    reason,
    comment: comment || '',
    ipHash: hashIpAddress(requestMeta.ip),
    userAgent: requestMeta.userAgent,
  });
}

module.exports = {
  createReport,
};
