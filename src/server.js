require('dotenv').config();

const { createApp } = require('./app');
const { getPool } = require('./db/pool');
const { runMigrations } = require('./db/migrations');
const { cleanupExpiredBlanks } = require('./blanks/blanks.repository');

const PORT = Number(process.env.PORT || 3000);
const DAY_IN_MS = 24 * 60 * 60 * 1000;

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
  console.error('Failed to start server', error);
  process.exit(1);
});
