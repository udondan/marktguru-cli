// Shared helpers for the offline tests. Not a test file itself, so
// `node --test tests/*.test.js` doesn't pick it up.
import { mock } from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// config.ts derives the config path from the home directory when it is first
// imported, so call this before importing anything from dist/.
export async function isolateHome() {
  const home = await mkdtemp(join(tmpdir(), 'marktguru-test-'));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  return home;
}

export class ExitError extends Error {
  constructor(code) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

// Captures console output and turns process.exit into a thrown ExitError.
// Restored by mock.restoreAll().
export function captureIo() {
  const out = [];
  const err = [];
  mock.method(console, 'log', (...args) => out.push(args.join(' ')));
  mock.method(console, 'error', (...args) => err.push(args.join(' ')));
  mock.method(process, 'exit', (code) => {
    throw new ExitError(code);
  });
  return {
    get stdout() {
      return out.join('\n');
    },
    get stderr() {
      return err.join('\n');
    },
  };
}

// Replaces global fetch with a router: `handler(url, init)` returns a
// Response (or throws). Every call is recorded.
export function mockFetch(handler) {
  const calls = [];
  mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  });
  return calls;
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function text(body, status = 200) {
  return new Response(body, { status });
}

export function makeOffer(overrides = {}) {
  return {
    id: 1,
    price: 1.49,
    oldPrice: 1.99,
    description: '250 g',
    externalUrl: 'https://shop.example/offer',
    product: { id: 2, name: 'Test Chips' },
    brand: { name: 'SnackCo' },
    advertisers: [{ name: 'BILLA PLUS' }],
    validityDates: [{ from: '2026-02-01', to: '2026-02-10' }],
    referencePrice: 5.96,
    unit: { shortName: 'kg' },
    volume: 0.25,
    quantity: 1,
    ...overrides,
  };
}

export function makeResult(results, overrides = {}) {
  return {
    totalResults: results.length,
    results,
    filters: { retailers: [], brands: [], categories: [] },
    ...overrides,
  };
}
