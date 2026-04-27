const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp, parseTrustProxy, redactUrlSecrets } = require('../src/app');

const rootDir = path.resolve(__dirname, '..');

test('parseTrustProxy keeps proxy trust disabled by default', () => {
  assert.equal(parseTrustProxy(undefined), null);
  assert.equal(parseTrustProxy(''), null);
  assert.equal(parseTrustProxy('0'), null);
  assert.equal(parseTrustProxy('false'), null);
});

test('parseTrustProxy treats true as one trusted proxy hop', () => {
  assert.equal(parseTrustProxy('true'), 1);
  assert.equal(parseTrustProxy('2'), 2);
  assert.equal(parseTrustProxy('loopback'), 'loopback');
});

test('redactUrlSecrets removes access tokens from logged URLs', () => {
  assert.equal(redactUrlSecrets('/my-blank?access=secret-token'), '/my-blank?access=%5Bredacted%5D');
  assert.equal(redactUrlSecrets('/my-blank?a=1&access=secret-token&b=2'), '/my-blank?a=1&access=%5Bredacted%5D&b=2');
  assert.equal(redactUrlSecrets('/my-blank?a=1'), '/my-blank?a=1');
});

test('development CSP does not upgrade localhost assets to HTTPS', async () => {
  const csp = await getHealthCsp('development');
  assert.doesNotMatch(csp, /upgrade-insecure-requests/);
});

test('production CSP keeps upgrade-insecure-requests enabled', async () => {
  const csp = await getHealthCsp('production');
  assert.match(csp, /upgrade-insecure-requests/);
});

test('active access-token index is delivered as a separate migration', () => {
  const initial = fs.readFileSync(path.join(rootDir, 'migrations/001_init.sql'), 'utf8');
  const followUp = fs.readFileSync(path.join(rootDir, 'migrations/002_access_token_active_index.sql'), 'utf8');

  assert.equal(initial.includes('blank_access_tokens_token_hash_active_idx'), false);
  assert.match(followUp, /blank_access_tokens_token_hash_active_idx/);
});

test('editor normalizes direct text nodes before serialization', () => {
  const editorSource = fs.readFileSync(path.join(rootDir, 'src/public/js/editor.js'), 'utf8');

  assert.match(editorSource, /function normaliseRootChildNodes\(root\)/);
  assert.match(editorSource, /normaliseRootChildNodes\(root\);/);
});

async function getHealthCsp(nodeEnv) {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;

  const app = createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    return response.headers.get('content-security-policy') || '';
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
}
