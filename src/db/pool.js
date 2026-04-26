const { Pool } = require('pg');

let pool;
const DEFAULT_DATABASE_URL = 'postgres://blanksy:blanksy@localhost:5432/blanksy';

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
      max: 10,
    });
  }

  return pool;
}

module.exports = {
  getPool,
  DEFAULT_DATABASE_URL,
};
