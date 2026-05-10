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

function mapTextRow(row) {
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
    'SELECT 1 FROM texts WHERE path = $1 LIMIT 1',
    [path],
  );
  return result.rowCount > 0;
}

async function createText({ path, title, signature, body, description, coverImageUrl, expiresAt }) {
  const pool = getPool();
  const result = await pool.query(`
    INSERT INTO texts (path, title, signature, body, description, cover_image_url, expires_at)
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

  return mapTextRow(result.rows[0]);
}


async function createTextWithAccessToken(textInput, accessTokenHash, label = 'owner') {
  return withTransaction(async (client) => {
    const result = await client.query(`
      INSERT INTO texts (path, title, signature, body, description, cover_image_url, expires_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
      RETURNING *
    `, [
      textInput.path,
      textInput.title,
      textInput.signature || null,
      JSON.stringify(textInput.body),
      textInput.description || null,
      textInput.coverImageUrl || null,
      textInput.expiresAt,
    ]);

    const text = mapTextRow(result.rows[0]);
    await client.query(`
      INSERT INTO text_access_tokens (text_id, token_hash, label)
      VALUES ($1, $2, $3)
    `, [text.id, accessTokenHash, label]);

    // Если передан userId (SSO) — привязываем владельца атомарно в той же транзакции.
    // Это гарантирует что text никогда не создаётся без владельца при авторизованном запросе.
    if (textInput.userId) {
      await client.query(`
        INSERT INTO text_owners (text_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [text.id, textInput.userId]);
    }

    return text;
  });
}

async function getTextByPath(path) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT *
    FROM texts
    WHERE path = $1
      AND deleted_at IS NULL
      AND status = 'published'
    LIMIT 1
  `, [path]);

  return mapTextRow(result.rows[0]);
}

async function getTextById(id) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT *
    FROM texts
    WHERE id = $1
      AND deleted_at IS NULL
      AND status = 'published'
    LIMIT 1
  `, [id]);

  return mapTextRow(result.rows[0]);
}

async function updateText(id, { title, signature, body, description, coverImageUrl }) {
  const pool = getPool();
  const result = await pool.query(`
    UPDATE texts
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

  return mapTextRow(result.rows[0]);
}

async function createTextVersion(text) {
  const pool = getPool();
  await pool.query(`
    INSERT INTO text_versions (text_id, title, signature, body)
    VALUES ($1, $2, $3, $4::jsonb)
  `, [
    text.id,
    text.title,
    text.signature || null,
    JSON.stringify(text.body),
  ]);
}


async function updateTextWithVersion(existingText, nextText) {
  return withTransaction(async (client) => {
    await client.query(`
      INSERT INTO text_versions (text_id, title, signature, body)
      VALUES ($1, $2, $3, $4::jsonb)
    `, [
      existingText.id,
      existingText.title,
      existingText.signature || null,
      JSON.stringify(existingText.body),
    ]);

    const result = await client.query(`
      UPDATE texts
      SET title = $2,
          signature = $3,
          body = $4::jsonb,
          description = $5,
          cover_image_url = $6,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `, [
      existingText.id,
      nextText.title,
      nextText.signature || null,
      JSON.stringify(nextText.body),
      nextText.description || null,
      nextText.coverImageUrl || null,
    ]);

    return mapTextRow(result.rows[0]);
  });
}

async function createAccessToken(textId, tokenHash, label = null) {
  const pool = getPool();
  const result = await pool.query(`
    INSERT INTO text_access_tokens (text_id, token_hash, label)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [textId, tokenHash, label]);

  return result.rows[0];
}

async function createAccessTokenWithLimit(textId, tokenHash, label, maxActiveTokens) {
  return withTransaction(async (client) => {
    await client.query('SELECT id FROM texts WHERE id = $1 FOR UPDATE', [textId]);

    const countResult = await client.query(`
      SELECT COUNT(*)::int AS active_count
      FROM text_access_tokens
      WHERE text_id = $1
        AND revoked_at IS NULL
    `, [textId]);

    if (countResult.rows[0].active_count >= maxActiveTokens) {
      return null;
    }

    const result = await client.query(`
      INSERT INTO text_access_tokens (text_id, token_hash, label)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [textId, tokenHash, label || null]);

    return result.rows[0];
  });
}

async function getTextByPathAndTokenHash(path, tokenHash) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT b.id, b.path, t.id AS access_token_id
    FROM texts b
    JOIN text_access_tokens t ON t.text_id = b.id
    WHERE b.path = $1
      AND b.deleted_at IS NULL
      AND b.status = 'published'
      AND t.token_hash = $2
      AND t.revoked_at IS NULL
    LIMIT 1
  `, [path, tokenHash]);

  return result.rows[0] || null;
}

async function getAccessTokenByTextIdAndHash(textId, tokenHash) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT *
    FROM text_access_tokens
    WHERE text_id = $1
      AND token_hash = $2
      AND revoked_at IS NULL
    LIMIT 1
  `, [textId, tokenHash]);

  return result.rows[0] || null;
}

async function touchAccessToken(accessTokenId) {
  const pool = getPool();
  await pool.query(`
    UPDATE text_access_tokens
    SET last_used_at = now()
    WHERE id = $1
  `, [accessTokenId]);
}

async function createReport({ textId, reason, comment, ipHash, userAgent }) {
  const pool = getPool();
  await pool.query(`
    INSERT INTO text_reports (text_id, reason, comment, ip_hash, user_agent)
    VALUES ($1, $2, $3, $4, $5)
  `, [textId, reason, comment || null, ipHash || null, userAgent || null]);
}

async function cleanupExpiredTexts() {
  const pool = getPool();
  await pool.query(`
    UPDATE texts
    SET status = 'deleted',
        deleted_at = now()
    WHERE expires_at < now()
      AND deleted_at IS NULL
  `);
}

module.exports = {
  linkTextToOwner,
  getTextsByOwner,
  isTextOwnedByUser,
  isPathTaken,
  createTextWithAccessToken,
  updateTextWithVersion,
  getTextByPath,
  getTextById,
  updateText,
  createTextVersion,
  createAccessToken,
  createAccessTokenWithLimit,
  getTextByPathAndTokenHash,
  getAccessTokenByTextIdAndHash,
  touchAccessToken,
  createReport,
  cleanupExpiredTexts,
};

// ── SSO / text ownership ────────────────────────────────────────────────────

async function linkTextToOwner(textId, userId) {
  const pool = getPool();
  await pool.query(`
    INSERT INTO text_owners (text_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `, [textId, userId]);
}

async function getTextsByOwner(userId) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT b.*
    FROM texts b
    JOIN text_owners o ON o.text_id = b.id
    WHERE o.user_id = $1
      AND b.deleted_at IS NULL
      AND b.status = 'published'
    ORDER BY b.updated_at DESC
    LIMIT 100
  `, [userId]);
  return result.rows.map(mapTextRow);
}

async function isTextOwnedByUser(textId, userId) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT 1 FROM text_owners
    WHERE text_id = $1 AND user_id = $2
    LIMIT 1
  `, [textId, userId]);
  return result.rowCount > 0;
}
