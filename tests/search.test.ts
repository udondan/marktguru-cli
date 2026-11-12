import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  isolateHome,
  captureIo,
  mockFetch,
  json,
  text,
  makeOffer,
  makeResult,
  type SearchOutput,
} from './helpers.ts';
import type { SearchResult } from '../dist/api.js';

const home = await isolateHome();
const {
  formatOfferText,
  formatResultsText,
  simplifyOffer,
  searchRawCommand,
  searchBuildCommand,
} = await import('../dist/commands/search.js');
const { getConfig, saveConfig } = await import('../dist/config.js');

async function loadFixture(): Promise<SearchResult> {
  const raw = await readFile(
    new URL('./fixtures/search-result.json', import.meta.url),
  );
  return JSON.parse(raw.toString()) as SearchResult;
}

// Answers searches with `result` and records every request.
function api(result: SearchResult) {
  return mockFetch(() => json(result));
}

test.afterEach(async () => {
  mock.restoreAll();
  await rm(join(home, '.marktguru'), { recursive: true, force: true });
});

test('formatResultsText includes externalUrl when available', async () => {
  const fixture = await loadFixture();
  const output = formatResultsText(fixture, 'chips');
  assert.match(output, /https:\/\/shop\.billa\.at/);
});

test('formatResultsText lists offers and the top five retailers', () => {
  const retailers = ['A', 'B', 'C', 'D', 'E', 'F'].map((name, id) => ({
    id,
    name,
    resultsCount: id + 1,
  }));
  const output = formatResultsText(
    makeResult([makeOffer(), makeOffer()], {
      totalResults: 7,
      filters: { retailers, brands: [], categories: [] },
    }),
    'chips',
  );

  assert.match(output, /^Found 7 offers for "chips":/);
  assert.equal(output.match(/Test Chips \[SnackCo\]/g)?.length, 2);
  assert.match(
    output,
    /📍 Retailers: A \(1\), B \(2\), C \(3\), D \(4\), E \(5\)$/,
  );
});

test('formatResultsText reports empty results', () => {
  assert.equal(
    formatResultsText(makeResult([]), 'nothing'),
    'Found 0 offers for "nothing":\n\nNo offers found.',
  );
});

test('formatOfferText with all details', () => {
  const offer = makeOffer({
    validityDates: [{ from: '2020-01-01', to: '2020-01-02' }],
  });
  assert.equal(
    formatOfferText(offer),
    [
      'Test Chips [SnackCo]',
      '  💰 €1.49 (was €1.99) -25% · €5.96/kg',
      '  📦 250 g',
      '  🏪 BILLA PLUS · expired',
      '  🔗 https://shop.example/offer',
    ].join('\n'),
  );
});

test('formatOfferText with minimal details', () => {
  const offer = makeOffer({
    oldPrice: null,
    brand: null,
    description: '',
    externalUrl: null,
    advertisers: [],
    validityDates: [],
    unit: null,
  });
  assert.equal(
    formatOfferText(offer),
    ['Test Chips', '  💰 €1.49', '  🏪 Unknown · '].join('\n'),
  );
});

test('formatOfferText skips the unit price without a volume', () => {
  const offer = makeOffer({ volume: null });
  assert.match(formatOfferText(offer), /💰 €1\.49 \(was €1\.99\) -25%$/m);
});

test('simplifyOffer exposes externalUrl only when present', async () => {
  const fixture = await loadFixture();
  const offer = fixture.results[0];
  const simplified = simplifyOffer(offer);

  assert.equal(simplified.externalUrl, offer.externalUrl);
});

test('simplifyOffer with all details', () => {
  assert.deepEqual(simplifyOffer(makeOffer()), {
    title: 'SnackCo - Test Chips - 250 g',
    price: 1.49,
    retailer: 'BILLA PLUS',
    expires: '2026-02-10',
    discountPercent: 25,
    externalUrl: 'https://shop.example/offer',
  });
});

test('simplifyOffer with minimal details', () => {
  const offer = makeOffer({
    oldPrice: 1.49,
    brand: null,
    description: '',
    externalUrl: null,
    advertisers: [],
    validityDates: [],
  });
  assert.deepEqual(simplifyOffer(offer), {
    title: 'Test Chips',
    price: 1.49,
    retailer: 'Unknown',
    expires: '',
    discountPercent: null,
    externalUrl: undefined,
  });
});

test('simplifyOffer without an old price', () => {
  assert.equal(
    simplifyOffer(makeOffer({ oldPrice: null })).discountPercent,
    null,
  );
});

test('search raw prints text results with the default limit', async () => {
  await saveConfig({ apiKey: 'stored-key' });
  const offers = Array.from({ length: 12 }, (_, id) => makeOffer({ id }));
  const calls = api(makeResult(offers, { totalResults: 30 }));
  const io = captureIo();

  await searchRawCommand('chips', {});

  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get('limit'), '10');
  assert.equal(calls[0].init.headers['x-apikey'], 'stored-key');
  assert.match(io.stdout, /^Found 30 offers for "chips":/);
  assert.equal(io.stdout.match(/Test Chips/g)?.length, 10);
});

test('search raw prints JSON and passes ZIP code and country', async () => {
  await saveConfig({ apiKey: 'stored-key' });
  const calls = api(makeResult([makeOffer()]));
  const io = captureIo();

  await searchRawCommand('chips', {
    json: true,
    limit: 2.7,
    zip: '10115',
    country: 'de',
  });

  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://api.marktguru.de');
  assert.equal(url.searchParams.get('limit'), '2');
  assert.equal(url.searchParams.get('zipCode'), '10115');
  assert.deepEqual(JSON.parse(io.stdout), {
    query: 'chips',
    total: 1,
    offers: [simplifyOffer(makeOffer())],
  });
});

test('search raw filters by retailer client-side', async () => {
  await saveConfig({ apiKey: 'stored-key' });
  const calls = api(
    makeResult(
      [
        makeOffer({ id: 1, advertisers: [{ name: 'SPAR' }] }),
        makeOffer({ id: 2, advertisers: [{ name: 'BILLA' }] }),
        makeOffer({ id: 3, advertisers: [{ name: 'Interspar' }] }),
        makeOffer({ id: 4, advertisers: [{ name: 'EUROSPAR' }] }),
      ],
      { totalResults: 250 },
    ),
  );
  const io = captureIo();

  await searchRawCommand('chips', { json: true, retailer: 'spar', limit: 2 });

  assert.equal(new URL(calls[0].url).searchParams.get('limit'), '100');
  const output = JSON.parse(io.stdout) as SearchOutput;
  assert.equal(output.total, 2);
  assert.deepEqual(
    output.offers.map((offer) => offer.retailer),
    ['SPAR', 'Interspar'],
  );
});

test('search raw rejects an invalid limit', async () => {
  await saveConfig({ apiKey: 'stored-key' });
  const calls = api(makeResult([]));
  const io = captureIo();

  await assert.rejects(searchRawCommand('chips', { limit: 0 }), { code: 1 });
  await assert.rejects(searchRawCommand('chips', { limit: NaN }), {
    code: 1,
  });

  assert.equal(calls.length, 0);
  assert.match(io.stderr, /Error: Limit must be a positive number\./);
});

// A site whose app.js embeds `key`, which the search endpoint accepts.
function siteWithKey(key: string, result: SearchResult) {
  return mockFetch((url, init) => {
    if (url.includes('/offers/search')) {
      return init.headers['x-apikey'] === key ? json(result) : text('', 401);
    }
    if (url.endsWith('/app.js')) return text(`apiKey: "${key}"`);
    return text('<script src="/app.js"></script>');
  });
}

test('search logs in automatically and logs to stdout', async () => {
  await saveConfig({ country: 'de' });
  const calls = siteWithKey('auto-key-1234567890', makeResult([]));
  const io = captureIo();

  await searchRawCommand('chips', {});

  assert.equal(new URL(calls[0].url).origin, 'https://www.marktguru.de');
  assert.equal((await getConfig()).apiKey, 'auto-key-1234567890');
  assert.match(io.stdout, /^No API key configured\. Running login\.\.\./);
  assert.equal(io.stderr, '');
});

test('search logs in for the --country and logs to stderr with --json', async () => {
  const calls = siteWithKey('auto-key-1234567890', makeResult([]));
  const io = captureIo();

  await searchRawCommand('chips', { json: true, country: 'de' });

  assert.equal(new URL(calls[0].url).origin, 'https://www.marktguru.de');
  assert.match(io.stderr, /^No API key configured\. Running login\.\.\./);
  assert.deepEqual(JSON.parse(io.stdout), {
    query: 'chips',
    total: 0,
    offers: [],
  });
});

test('search build runs the built query and explains it', async () => {
  await saveConfig({ apiKey: 'stored-key' });
  const calls = api(makeResult([]));
  const io = captureIo();

  await searchBuildCommand({
    term: ['kellys'],
    phrase: ['erdnuss snips'],
    wildcard: ['bio milch'],
    or: ['manner'],
    group: ['a OR b'],
    explain: true,
    json: true,
  });

  const query = 'kellys "erdnuss snips" "bio milch" (manner) (a OR b)';
  assert.equal(new URL(calls[0].url).searchParams.get('q'), query);
  assert.equal(
    io.stderr,
    [
      `Query: ${query}`,
      'Warning: Wildcard contained whitespace and was quoted as a phrase.',
    ].join('\n'),
  );
});

test('search build stays quiet without --explain and warnings', async () => {
  await saveConfig({ apiKey: 'stored-key' });
  api(makeResult([]));
  const io = captureIo();

  await searchBuildCommand({ term: ['kellys'], json: true });

  assert.equal(io.stderr, '');
});

test('search build fails without query parts', async () => {
  const calls = api(makeResult([]));
  const io = captureIo();

  await assert.rejects(searchBuildCommand({}), { code: 1 });

  assert.equal(calls.length, 0);
  assert.match(io.stderr, /Error: No query parts provided/);
});
