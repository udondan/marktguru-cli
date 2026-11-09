import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { isolateHome, mockFetch, text } from './helpers.js';

await isolateHome();
const { extractApiKey } = await import('../dist/auth.js');

const VALID_KEY = 'valid-key-1234567890';
const BASE64_KEY = 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZn=';

// Routes the scraper's requests: `pages` maps a URL to its body, a Response
// or a function to call; `validKeys` are accepted by the search endpoint.
function site({ pages, validKeys = [VALID_KEY] }) {
  return mockFetch((url, init) => {
    if (url.includes('/api/v1/offers/search')) {
      return text('', validKeys.includes(init.headers['x-apikey']) ? 200 : 401);
    }
    const page = pages[url];
    if (page === undefined) return text('not found', 404);
    if (typeof page === 'function') return page();
    return typeof page === 'string' ? text(page) : page;
  });
}

test.afterEach(() => {
  mock.restoreAll();
});

test('extractApiKey rejects unsupported countries', async () => {
  await assert.rejects(extractApiKey({ country: 'fr' }), /Unsupported country/);
});

test('extractApiKey finds a key in a script of the entry page', async () => {
  const calls = site({
    pages: {
      'https://www.marktguru.at/': '<script src="/app.js"></script>',
      'https://www.marktguru.at/app.js': `headers: { "x-apikey": "${VALID_KEY}" }`,
    },
  });

  assert.equal(await extractApiKey(), VALID_KEY);
  assert.ok(calls.every((call) => call.init.signal instanceof AbortSignal));
});

test('extractApiKey logs progress and falls through entry URLs', async () => {
  const messages = [];
  site({
    pages: {
      'https://www.marktguru.de/': text('', 500),
      'https://www.marktguru.de/search': () => {
        throw new Error('network down');
      },
      'https://www.marktguru.de/search?q=test': [
        '<script src="//cdn.marktguru.de/a.js"></script>',
        '<script type="module" src="https://cdn.marktguru.de/b.js"></script>',
        '<script src="relative.js"></script>',
        '<script src="/missing.js"></script>',
      ].join(''),
      'https://cdn.marktguru.de/a.js': `const config = { apiKey: "not-a-valid-key" };`,
      'https://cdn.marktguru.de/b.js': `const config = { apiKey: "${VALID_KEY}" };`,
    },
  });

  const key = await extractApiKey({
    country: 'de',
    log: (message) => messages.push(message),
  });

  assert.equal(key, VALID_KEY);
  assert.deepEqual(messages, [
    '→ Fetching entry HTML...',
    '✓ Using entry URL: https://www.marktguru.de/search?q=test',
    '→ Scanning 3 script(s)...',
  ]);
});

test('extractApiKey picks up base64 keys with padding from the HTML', async () => {
  site({
    validKeys: [BASE64_KEY],
    pages: {
      'https://www.marktguru.at/': [
        // Too short, no padding, too long: all ignored.
        'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNk',
        'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9w ',
        'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3g= ',
        BASE64_KEY,
        '<script src="https://cdn.marktguru.at/a.js"></script>',
      ].join(' '),
      'https://cdn.marktguru.at/a.js': '',
    },
  });

  assert.equal(await extractApiKey({ country: 'at' }), BASE64_KEY);
});

test('extractApiKey scans at most 20 scripts', async () => {
  const scripts = Array.from(
    { length: 25 },
    (_, i) => `<script src="/s${i}.js"></script>`,
  ).join('');
  const calls = site({
    pages: {
      'https://www.marktguru.at/': scripts,
      'https://www.marktguru.at/s0.js': `apiKey = '${VALID_KEY}'`,
    },
  });

  assert.equal(await extractApiKey(), VALID_KEY);
  const scriptCalls = calls.filter((call) => call.url.endsWith('.js'));
  assert.equal(scriptCalls.length, 20);
});

test('extractApiKey fails when no entry URL responds', async () => {
  site({ pages: {} });
  await assert.rejects(
    extractApiKey(),
    /HTTP 404 for https:\/\/www\.marktguru\.at\/suche\?q=test/,
  );
});

test('extractApiKey wraps non-Error fetch failures', async () => {
  mockFetch(() => {
    throw 'offline';
  });
  await assert.rejects(extractApiKey(), /^Error: offline$/);
});

test('extractApiKey fails when the page has no scripts', async () => {
  site({ pages: { 'https://www.marktguru.at/': '<html></html>' } });
  await assert.rejects(extractApiKey(), /No scripts found/);
});

test('extractApiKey fails when no candidate is valid', async () => {
  site({
    validKeys: [],
    pages: {
      'https://www.marktguru.at/': `<script src="/app.js"></script> apiKey: "${VALID_KEY}"`,
      'https://www.marktguru.at/app.js': '',
    },
  });
  await assert.rejects(extractApiKey(), /Failed to capture a valid API key/);
});
