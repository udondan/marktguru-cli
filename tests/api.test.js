import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { isolateHome, mockFetch, json, makeResult } from './helpers.js';

const home = await isolateHome();
const { getApiBase, search, formatPrice, formatDiscount, formatValidity } =
  await import('../dist/api.js');
const { saveConfig } = await import('../dist/config.js');

const DAY = 24 * 60 * 60 * 1000;

test.afterEach(async () => {
  mock.restoreAll();
  await rm(join(home, '.marktguru'), { recursive: true, force: true });
});

test('getApiBase returns correct URL for AT', () => {
  assert.equal(getApiBase('at'), 'https://api.marktguru.at/api/v1');
});

test('getApiBase returns correct URL for DE', () => {
  assert.equal(getApiBase('de'), 'https://api.marktguru.de/api/v1');
});

test('getApiBase throws on unsupported country', () => {
  assert.throws(() => getApiBase('fr'), /Unsupported country/);
});

test('search throws without an API key', async () => {
  const calls = mockFetch(() => json(makeResult([])));
  await assert.rejects(search({ query: 'milch' }), /No API key configured/);
  assert.equal(calls.length, 0);
});

test('search uses the configured key, ZIP code and country', async () => {
  await saveConfig({ apiKey: 'config-key', zipCode: '10115', country: 'de' });
  const calls = mockFetch(() => json(makeResult([])));

  const result = await search({ query: 'milch' });

  assert.deepEqual(result, makeResult([]));
  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://api.marktguru.de');
  assert.equal(url.pathname, '/api/v1/offers/search');
  assert.equal(url.searchParams.get('as'), 'web');
  assert.equal(url.searchParams.get('q'), 'milch');
  assert.equal(url.searchParams.get('limit'), '20');
  assert.equal(url.searchParams.get('offset'), '0');
  assert.equal(url.searchParams.get('zipCode'), '10115');
  assert.equal(url.searchParams.has('retailerIds'), false);
  assert.equal(calls[0].init.headers['x-apikey'], 'config-key');
});

test('search prefers explicit options over the config', async () => {
  await saveConfig({ apiKey: 'config-key', zipCode: '10115', country: 'de' });
  const calls = mockFetch(() => json(makeResult([])));

  await search({
    query: 'milch',
    apiKey: 'option-key',
    zipCode: '1020',
    country: 'at',
    limit: 5,
    offset: 10,
    retailerId: 42,
  });

  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://api.marktguru.at');
  assert.equal(url.searchParams.get('limit'), '5');
  assert.equal(url.searchParams.get('offset'), '10');
  assert.equal(url.searchParams.get('zipCode'), '1020');
  assert.equal(url.searchParams.get('retailerIds'), '42');
  assert.equal(calls[0].init.headers['x-apikey'], 'option-key');
});

test('search falls back to the default ZIP code and country', async () => {
  // A config file that sets neither zipCode nor country.
  await saveConfig({ apiKey: 'config-key', country: '' });
  const calls = mockFetch(() => json(makeResult([])));

  await search({ query: 'milch' });

  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://api.marktguru.at');
  assert.equal(url.searchParams.get('zipCode'), '1010');
});

test('search reports an invalid API key', async () => {
  mockFetch(() => json({}, 401));
  await assert.rejects(
    search({ query: 'milch', apiKey: 'bad' }),
    /API key invalid or expired/,
  );
});

test('search reports other API errors', async () => {
  mockFetch(() => new Response('', { status: 500, statusText: 'Boom' }));
  await assert.rejects(
    search({ query: 'milch', apiKey: 'key' }),
    /API error: 500 Boom/,
  );
});

test('formatPrice formats euros with two decimals', () => {
  assert.equal(formatPrice(1.5), '€1.50');
});

test('formatDiscount', () => {
  assert.equal(formatDiscount(1, null), '');
  assert.equal(formatDiscount(2, 2), '');
  assert.equal(formatDiscount(3, 2), '');
  assert.equal(formatDiscount(1.5, 2), '-25%');
});

test('formatValidity', () => {
  const inDays = (days) => [
    { from: '2020-01-01', to: new Date(Date.now() + days).toISOString() },
  ];
  assert.equal(formatValidity([]), '');
  assert.equal(formatValidity(inDays(-2 * DAY)), 'expired');
  assert.equal(formatValidity(inDays(-DAY / 24)), 'today');
  assert.equal(formatValidity(inDays(DAY / 2)), '1 day left');
  assert.equal(formatValidity(inDays(2.5 * DAY)), '3 days left');
});
