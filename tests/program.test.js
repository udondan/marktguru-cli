import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  isolateHome,
  captureIo,
  mockFetch,
  json,
  text,
  makeOffer,
  makeResult,
} from './helpers.js';

const home = await isolateHome();
const { createProgram } = await import('../dist/program.js');
const { getConfig, saveConfig } = await import('../dist/config.js');
const { QUERY_SYNTAX_HELP } = await import('../dist/query.js');

// Commander's own output (help, usage errors) is collected per command,
// since subcommands copy the output settings when they are created.
function quietProgram() {
  const program = createProgram();
  const output = { out: '', err: '' };
  const capture = (command) => {
    command.configureOutput({
      writeOut: (str) => (output.out += str),
      writeErr: (str) => (output.err += str),
    });
    command.commands.forEach(capture);
  };
  capture(program);
  return { program, output };
}

// Runs the CLI in-process and returns Commander's own output.
async function cli(...args) {
  const { program, output } = quietProgram();
  await program.parseAsync(['node', 'marktguru', ...args]);
  return output;
}

test.afterEach(async () => {
  mock.restoreAll();
  await rm(join(home, '.marktguru'), { recursive: true, force: true });
});

test('login', async () => {
  const key = 'scraped-key-1234567890';
  mockFetch((url, init) => {
    if (url.includes('/offers/search')) {
      return text('', init.headers['x-apikey'] === key ? 200 : 401);
    }
    if (url.endsWith('/app.js')) return text(`apiKey: "${key}"`);
    return text('<script src="/app.js"></script>');
  });
  const io = captureIo();

  await cli('--json', 'login');

  assert.deepEqual(JSON.parse(io.stdout), { success: true, apiKey: key });
  assert.equal((await getConfig()).apiKey, key);
});

test('search raw', async () => {
  await saveConfig({ apiKey: 'stored-key' });
  const calls = mockFetch(() => json(makeResult([makeOffer()])));
  const io = captureIo();

  await cli('search', 'raw', 'chips', '-z', '1020', '-n', '3', '-r', 'billa');

  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get('q'), 'chips');
  assert.equal(url.searchParams.get('zipCode'), '1020');
  assert.equal(url.searchParams.get('limit'), '100');
  assert.match(io.stdout, /^Found 1 offers for "chips":/);
});

test('search build', async () => {
  await saveConfig({ apiKey: 'stored-key' });
  const calls = mockFetch(() => json(makeResult([])));
  const io = captureIo();

  await cli(
    'search',
    'build',
    '--term',
    'kellys',
    '--term',
    'chips',
    '--phrase',
    'erdnuss snips',
    '--wildcard',
    'kell*',
    '--or',
    'manner',
    '--or',
    'milka',
    '--group',
    'a OR b',
    '--explain',
    '-n',
    '5',
    '-j',
  );

  const query = 'kellys chips "erdnuss snips" kell* (manner OR milka) (a OR b)';
  assert.equal(new URL(calls[0].url).searchParams.get('q'), query);
  assert.equal(new URL(calls[0].url).searchParams.get('limit'), '5');
  assert.equal(io.stderr, `Query: ${query}`);
  assert.deepEqual(JSON.parse(io.stdout), { query, total: 0, offers: [] });
});

test('search rejects a limit that is not a positive integer', async () => {
  const calls = mockFetch(() => json(makeResult([])));
  captureIo();

  for (const limit of ['0', 'abc']) {
    const { program, output } = quietProgram();
    await assert.rejects(
      program.parseAsync([
        'node',
        'marktguru',
        'search',
        'raw',
        'x',
        '-n',
        limit,
      ]),
      { code: 1 },
    );
    assert.match(output.err, /Value must be a positive integer\./);
  }

  assert.equal(calls.length, 0);
});

test('search syntax', async () => {
  const io = captureIo();
  await cli('search', 'syntax');
  assert.equal(io.stdout, QUERY_SYNTAX_HELP);
});

test('search without a subcommand prints its help', async () => {
  captureIo();
  const { out } = await cli('search');
  assert.match(out, /^Usage: marktguru search/);
});

test('set-zip', async () => {
  const io = captureIo();

  await cli('set-zip', '1020');
  await cli('set-zip', '1030', '--json');

  assert.equal(
    io.stdout,
    [
      '✓ Default ZIP code set to: 1020',
      '{"success":true,"zipCode":"1030"}',
    ].join('\n'),
  );
  assert.equal((await getConfig()).zipCode, '1030');
});

test('set-country rejects unknown countries', async () => {
  const io = captureIo();

  await assert.rejects(cli('set-country', 'fr'), { code: 1 });

  assert.equal(io.stderr, 'Error: Invalid country "fr". Valid options: at, de');
});

test('set-country keeps the key when the country stays the same', async () => {
  await saveConfig({ apiKey: 'stored-key', country: 'at' });
  const io = captureIo();

  await cli('set-country', 'AT');

  assert.equal(io.stdout, '✓ Default country set to: at');
  assert.equal((await getConfig()).apiKey, 'stored-key');
});

test('set-country clears the key when the country changes', async () => {
  await saveConfig({ apiKey: 'stored-key', country: 'at' });
  const io = captureIo();

  await cli('set-country', 'de');

  assert.equal(
    io.stdout,
    [
      '✓ Default country set to: de',
      "  API key cleared — run 'marktguru login' to fetch a matching key.",
    ].join('\n'),
  );
  const config = await getConfig();
  assert.equal(config.country, 'de');
  assert.equal(config.apiKey, undefined);
});

test('set-country --json reports whether a key was cleared', async () => {
  const io = captureIo();

  await cli('set-country', 'de', '--json');
  await saveConfig({ apiKey: 'stored-key' });
  await cli('set-country', 'at', '--json');

  assert.deepEqual(
    io.stdout.split('\n').map((line) => JSON.parse(line)),
    [
      { success: true, country: 'de', apiKeyCleared: false },
      { success: true, country: 'at', apiKeyCleared: true },
    ],
  );
});

test('config shows defaults', async () => {
  // A config file that sets no country either.
  await saveConfig({ country: '' });
  const io = captureIo();

  await cli('config');
  await cli('config', '--json');

  const configPath = join(home, '.marktguru', 'config.json');
  const [textOutput, jsonOutput] = io.stdout.split('\n{');
  assert.equal(
    textOutput,
    [
      'Configuration:',
      '  API Key: (not set)',
      '  ZIP Code: (default: 1010)',
      '  Country: (default: at)',
      `  Config file: ${configPath}`,
    ].join('\n'),
  );
  assert.deepEqual(JSON.parse(`{${jsonOutput}`), {
    apiKey: null,
    apiKeySet: false,
    zipCode: '1010',
    country: 'at',
    configPath,
  });
});

test('config shows stored values with a truncated key', async () => {
  await saveConfig({
    apiKey: 'abcdefghijklmnopqrstuvwxyz',
    zipCode: '10115',
    country: 'de',
  });
  const io = captureIo();

  await cli('config');
  await cli('--json', 'config');

  const [textOutput, jsonOutput] = io.stdout.split('\n{');
  assert.match(textOutput, /API Key: abcdefghij\.\.\.\n/);
  assert.match(textOutput, /ZIP Code: 10115\n/);
  assert.match(textOutput, /Country: de\n/);
  const parsed = JSON.parse(`{${jsonOutput}`);
  assert.equal(parsed.apiKey, 'abcdefghij...');
  assert.equal(parsed.apiKeySet, true);
  assert.equal(parsed.zipCode, '10115');
  assert.equal(parsed.country, 'de');
  assert.ok(!io.stdout.includes('abcdefghijklmnopqrstuvwxyz'));
});
