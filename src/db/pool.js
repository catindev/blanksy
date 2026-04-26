const { Pool } = require('pg');

let pool;
const DEFAULT_DATABASE_URL = 'postgres://blanksy:blanksy@localhost:5432/blanksy';

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });

    pool.on('error', (err) => {
      // Idle client упал (PostgreSQL перезапустился, network blip).
      // Логируем, но не крашим процесс — pool пересоздаст соединение автоматически.
      console.error('[pg] idle client error:', err.message);
    });
  }

  return pool;
}

module.exports = {
  getPool,
  DEFAULT_DATABASE_URL,
};
