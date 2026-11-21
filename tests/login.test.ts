import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { isolateHome, captureIo, mockFetch, text } from './helpers.ts';

const home = await isolateHome();
const { login } = await import('../dist/commands/login.js');
const { getConfig, saveConfig } = await import('../dist/config.js');

const KEY = 'scraped-key-1234567890';

// A site whose app.js embeds KEY, which the search endpoint accepts.
function workingSite() {
  mockFetch((url, init) => {
    if (url.includes('/offers/search')) {
      return text('', init.headers['x-apikey'] === KEY ? 200 : 401);
    }
    if (url.endsWith('/app.js')) return text(`apiKey: "${KEY}"`);
    return text('<script src="/app.js"></script>');
  });
}

test.afterEach(async () => {
  mock.restoreAll();
  await rm(join(home, '.marktguru'), { recursive: true, force: true });
});

test('login saves the key and prints a truncated version', async () => {
  await saveConfig({ country: 'de' });
  workingSite();
  const io = captureIo();

  await login({});

  assert.equal((await getConfig()).apiKey, KEY);
  assert.match(io.stdout, /Extracting Marktguru API key/);
  assert.match(io.stdout, /https:\/\/www\.marktguru\.de\//);
  assert.match(io.stdout, /✓ API key extracted and saved!/);
  assert.match(io.stdout, /Key: scraped-key-123\.\.\./);
  assert.ok(!io.stdout.includes(KEY));
});

test('login prints JSON only with --json', async () => {
  workingSite();
  const io = captureIo();

  await login({ json: true });

  assert.deepEqual(JSON.parse(io.stdout), { success: true, apiKey: KEY });
});

test('login reports failures and exits with 1', async () => {
  mockFetch(() => text('', 503));
  const io = captureIo();

  await assert.rejects(login({ json: false }), { code: 1 });

  assert.match(io.stderr, /✗ HTTP 503/);
  assert.equal((await getConfig()).apiKey, undefined);
});

test('login reports failures as JSON with --json', async () => {
  mockFetch(() => text('', 503));
  const io = captureIo();

  await assert.rejects(login({ json: true }), { code: 1 });

  const output = JSON.parse(io.stdout) as { success: boolean; error: string };
  assert.equal(output.success, false);
  assert.match(output.error, /HTTP 503/);
});
