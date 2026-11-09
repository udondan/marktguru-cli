// Shared helpers for the offline tests. Not a test file itself, so
// `node --test tests/*.test.ts` doesn't pick it up.
import { mock } from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Offer, SearchResult } from '../dist/api.js';
import type { SimpleOffer } from '../dist/commands/search.js';

// config.ts derives the config path from the home directory when it is first
// imported, so call this before importing anything from dist/.
export async function isolateHome(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'marktguru-test-'));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  return home;
}

export class ExitError extends Error {
  code: number | string | null | undefined;

  constructor(code: number | string | null | undefined) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

export interface CapturedIo {
  readonly stdout: string;
  readonly stderr: string;
}

// Captures console output and turns process.exit into a thrown ExitError.
// Restored by mock.restoreAll().
export function captureIo(): CapturedIo {
  const out: string[] = [];
  const err: string[] = [];
  mock.method(console, 'log', (...args: unknown[]) => out.push(args.join(' ')));
  mock.method(console, 'error', (...args: unknown[]) =>
    err.push(args.join(' ')),
  );
  mock.method(process, 'exit', (code?: number | string | null) => {
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

// The scraper and API client always pass a plain header object.
export type FetchInit = RequestInit & { headers: Record<string, string> };

export interface FetchCall {
  url: string;
  init: FetchInit;
}

export type FetchHandler = (
  url: string,
  init: FetchInit,
) => Response | Promise<Response>;

// Replaces global fetch with a router: `handler(url, init)` returns a
// Response (or throws). Every call is recorded.
export function mockFetch(handler: FetchHandler): FetchCall[] {
  const calls: FetchCall[] = [];
  mock.method(
    globalThis,
    'fetch',
    async (url: string | URL | Request, init?: RequestInit) => {
      const href = url instanceof Request ? url.url : url.toString();
      const call = { url: href, init: init as FetchInit };
      calls.push(call);
      return handler(call.url, call.init);
    },
  );
  return calls;
}

// What `search --json` prints.
export interface SearchOutput {
  query: string;
  total: number;
  offers: SimpleOffer[];
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function text(body: string, status = 200): Response {
  return new Response(body, { status });
}

export function makeOffer(overrides: Partial<Offer> = {}): Offer {
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

export function makeResult(
  results: Offer[],
  overrides: Partial<SearchResult> = {},
): SearchResult {
  return {
    totalResults: results.length,
    results,
    filters: { retailers: [], brands: [], categories: [] },
    ...overrides,
  };
}
