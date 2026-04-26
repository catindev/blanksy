const { getPool } = require('../db/pool');


async function withTransaction(callback) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function mapBlankRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    path: row.path,
    title: row.title,
    signature: row.signature || '',
    body: row.body,
    description: row.description || '',
    coverImageUrl: row.cover_image_url || '',
    status: row.status,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    publishedAt: row.published_at.toISOString(),
  };
}

async function isPathTaken(path) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT 1 FROM blanks WHERE path = $1 LIMIT 1',
    [path],
  );
  return result.rowCount > 0;
}

async function createBlank({ path, title, signature, body, description, coverImageUrl, expiresAt }) {
  const pool = getPool();
  const result = await pool.query(`
    INSERT INTO blanks (path, title, signature, body, description, cover_image_url, expires_at)
    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
    RETURNING *
  `, [
    path,
    title,
    signature || null,
    JSON.stringify(body),
    description || null,
    coverImageUrl || null,
    expiresAt,
  ]);

  return mapBlankRow(result.rows[0]);
}


async function createBlankWithAccessToken(blankInput, accessTokenHash, label = 'owner') {
  return withTransaction(async (client) => {
    const result = await client.query(`
      INSERT INTO blanks (path, title, signature, body, description, cover_image_url, expires_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
      RETURNING *
    `, [
      blankInput.path,
      blankInput.title,
      blankInput.signature || null,
      JSON.stringify(blankInput.body),
      blankInput.description || null,
      blankInput.coverImageUrl || null,
      blankInput.expiresAt,
    ]);

    const blank = mapBlankRow(result.rows[0]);
    await client.query(`
      INSERT INTO blank_access_tokens (blank_id, token_hash, label)
      VALUES ($1, $2, $3)
    `, [blank.id, accessTokenHash, label]);

    return blank;
  });
}

async function getBlankByPath(path) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT *
    FROM blanks
    WHERE path = $1
      AND deleted_at IS NULL
      AND status = 'published'
    LIMIT 1
  `, [path]);

  return mapBlankRow(result.rows[0]);
}

async function getBlankById(id) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT *
    FROM blanks
    WHERE id = $1
      AND deleted_at IS NULL
      AND status = 'published'
    LIMIT 1
  `, [id]);

  return mapBlankRow(result.rows[0]);
}

async function updateBlank(id, { title, signature, body, description, coverImageUrl }) {
  const pool = getPool();
  const result = await pool.query(`
    UPDATE blanks
    SET title = $2,
        signature = $3,
        body = $4::jsonb,
        description = $5,
        cover_image_url = $6,
        updated_at = now()
    WHERE id = $1
    RETURNING *
  `, [
    id,
    title,
    signature || null,
    JSON.stringify(body),
    description || null,
    coverImageUrl || null,
  ]);

  return mapBlankRow(result.rows[0]);
}

async function createBlankVersion(blank) {
  const pool = getPool();
  await pool.query(`
    INSERT INTO blank_versions (blank_id, title, signature, body)
    VALUES ($1, $2, $3, $4::jsonb)
  `, [
    blank.id,
    blank.title,
    blank.signature || null,
    JSON.stringify(blank.body),
  ]);
}


async function updateBlankWithVersion(existingBlank, nextBlank) {
  return withTransaction(async (client) => {
    await client.query(`
      INSERT INTO blank_versions (blank_id, title, signature, body)
      VALUES ($1, $2, $3, $4::jsonb)
    `, [
      existingBlank.id,
      existingBlank.title,
      existingBlank.signature || null,
      JSON.stringify(existingBlank.body),
    ]);

    const result = await client.query(`
      UPDATE blanks
      SET title = $2,
          signature = $3,
          body = $4::jsonb,
          description = $5,
          cover_image_url = $6,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `, [
      existingBlank.id,
      nextBlank.title,
      nextBlank.signature || null,
      JSON.stringify(nextBlank.body),
      nextBlank.description || null,
      nextBlank.coverImageUrl || null,
    ]);

    return mapBlankRow(result.rows[0]);
  });
}

async function createAccessToken(blankId, tokenHash, label = null) {
  const pool = getPool();
  const result = await pool.query(`
    INSERT INTO blank_access_tokens (blank_id, token_hash, label)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [blankId, tokenHash, label]);

  return result.rows[0];
}

async function createAccessTokenWithLimit(blankId, tokenHash, label, maxActiveTokens) {
  return withTransaction(async (client) => {
    await client.query('SELECT id FROM blanks WHERE id = $1 FOR UPDATE', [blankId]);

    const countResult = await client.query(`
      SELECT COUNT(*)::int AS active_count
      FROM blank_access_tokens
      WHERE blank_id = $1
        AND revoked_at IS NULL
    `, [blankId]);

    if (countResult.rows[0].active_count >= maxActiveTokens) {
      return null;
    }

    const result = await client.query(`
      INSERT INTO blank_access_tokens (blank_id, token_hash, label)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [blankId, tokenHash, label || null]);

    return result.rows[0];
  });
}

async function getBlankByPathAndTokenHash(path, tokenHash) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT b.id, b.path, t.id AS access_token_id
    FROM blanks b
    JOIN blank_access_tokens t ON t.blank_id = b.id
    WHERE b.path = $1
      AND b.deleted_at IS NULL
      AND b.status = 'published'
      AND t.token_hash = $2
      AND t.revoked_at IS NULL
    LIMIT 1
  `, [path, tokenHash]);

  return result.rows[0] || null;
}

async function getAccessTokenByBlankIdAndHash(blankId, tokenHash) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT *
    FROM blank_access_tokens
    WHERE blank_id = $1
      AND token_hash = $2
      AND revoked_at IS NULL
    LIMIT 1
  `, [blankId, tokenHash]);

  return result.rows[0] || null;
}

async function touchAccessToken(accessTokenId) {
  const pool = getPool();
  await pool.query(`
    UPDATE blank_access_tokens
    SET last_used_at = now()
    WHERE id = $1
  `, [accessTokenId]);
}

async function createReport({ blankId, reason, comment, ipHash, userAgent }) {
  const pool = getPool();
  await pool.query(`
    INSERT INTO blank_reports (blank_id, reason, comment, ip_hash, user_agent)
    VALUES ($1, $2, $3, $4, $5)
  `, [blankId, reason, comment || null, ipHash || null, userAgent || null]);
}

async function cleanupExpiredBlanks() {
  const pool = getPool();
  await pool.query(`
    UPDATE blanks
    SET status = 'deleted',
        deleted_at = now()
    WHERE expires_at < now()
      AND deleted_at IS NULL
  `);
}

module.exports = {
  isPathTaken,
  createBlankWithAccessToken,
  updateBlankWithVersion,
  createBlank,
  getBlankByPath,
  getBlankById,
  updateBlank,
  createBlankVersion,
  createAccessToken,
  createAccessTokenWithLimit,
  getBlankByPathAndTokenHash,
  getAccessTokenByBlankIdAndHash,
  touchAccessToken,
  createReport,
  cleanupExpiredBlanks,
};
