require('dotenv').config();

const { createApp } = require('./app');
const { getPool, DEFAULT_DATABASE_URL } = require('./db/pool');
const { runMigrations } = require('./db/migrations');
const { cleanupExpiredBlanks } = require('./blanks/blanks.repository');

const PORT = Number(process.env.PORT || 3000);
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function printDatabaseHelp(error) {
  if (error?.code !== 'ECONNREFUSED') {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  console.error('');
  console.error(`PostgreSQL is not reachable at ${databaseUrl}`);
  console.error('Start the full stack with: docker compose up --build');
  console.error('Or start only the database with: docker compose up db -d');
  console.error('');
}

async function start() {
  await runMigrations();
  await cleanupExpiredBlanks();
  setInterval(() => {
    cleanupExpiredBlanks().catch((error) => {
      console.error('Cleanup job failed', error);
    });
  }, DAY_IN_MS);

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`Blanksy listening on http://localhost:${PORT}`);
  });

  async function shutdown(signal) {
    console.log(`Received ${signal}, shutting down`);
    server.close(async () => {
      await getPool().end();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  printDatabaseHelp(error);
  console.error('Failed to start server', error);
  process.exit(1);
});
