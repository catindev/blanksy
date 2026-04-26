#!/usr/bin/env node

require('dotenv').config();

const { spawn, spawnSync } = require('node:child_process');
const { URL } = require('node:url');

const { Client } = require('pg');
const { DEFAULT_DATABASE_URL } = require('../src/db/pool');

const DEV_APP_ARGS = ['--watch', 'src/server.js'];
const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

function parseDatabaseUrl() {
  return new URL(process.env.DATABASE_URL || DEFAULT_DATABASE_URL);
}

function shouldManageDockerDb(databaseUrl) {
  return ['localhost', '127.0.0.1'].includes(databaseUrl.hostname) && databaseUrl.port === '5432';
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function isDatabaseReady(connectionString) {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 1500,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

function runDockerComposeUpDb() {
  const result = spawnSync('docker', ['compose', 'up', 'db', '-d'], {
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function ensureDatabase() {
  const databaseUrl = parseDatabaseUrl();
  const connectionString = databaseUrl.toString();

  if (!shouldManageDockerDb(databaseUrl)) {
    return;
  }

  if (await isDatabaseReady(connectionString)) {
    return;
  }

  console.log('Local PostgreSQL is not running, starting docker compose service `db`...');
  runDockerComposeUpDb();

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isDatabaseReady(connectionString)) {
      console.log('PostgreSQL is ready.');
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.error(`PostgreSQL did not become ready within ${STARTUP_TIMEOUT_MS / 1000}s.`);
  console.error('Try checking Docker Desktop and `docker compose logs db`.');
  process.exit(1);
}

async function main() {
  try {
    await ensureDatabase();
  } catch (error) {
    console.error('Failed to bootstrap local development database.');
    console.error(error.message || error);
    process.exit(1);
  }

  const child = spawn(process.execPath, DEV_APP_ARGS, {
    stdio: 'inherit',
  });

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main();
