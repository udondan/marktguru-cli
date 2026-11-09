import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { isolateHome } from './helpers.js';

const home = await isolateHome();
const { getConfig, saveConfig, DEFAULT_COUNTRY } =
  await import('../dist/config.js');
const configDir = join(home, '.marktguru');
const configFile = join(configDir, 'config.json');

test.beforeEach(async () => {
  await rm(configDir, { recursive: true, force: true });
});

test('getConfig returns defaults when no config file exists', async () => {
  assert.deepEqual(await getConfig(), {
    country: DEFAULT_COUNTRY,
    configPath: configFile,
  });
});

test('getConfig returns defaults when the config file is not valid JSON', async () => {
  await mkdir(configDir, { recursive: true });
  await writeFile(configFile, '{not json');
  assert.deepEqual(await getConfig(), {
    country: DEFAULT_COUNTRY,
    configPath: configFile,
  });
});

test('getConfig treats empty and null values as unset', async () => {
  await mkdir(configDir, { recursive: true });
  await writeFile(
    configFile,
    JSON.stringify({ apiKey: null, zipCode: '', country: '' }),
  );
  assert.deepEqual(await getConfig(), {
    country: DEFAULT_COUNTRY,
    configPath: configFile,
  });
});

test('saveConfig creates the directory, merges and omits configPath', async () => {
  await saveConfig({ zipCode: '1020' });
  await saveConfig({ apiKey: 'secret-key', country: 'de' });

  const persisted = JSON.parse(await readFile(configFile, 'utf-8'));
  assert.deepEqual(persisted, {
    country: 'de',
    zipCode: '1020',
    apiKey: 'secret-key',
  });

  assert.deepEqual(await getConfig(), {
    country: 'de',
    zipCode: '1020',
    apiKey: 'secret-key',
    configPath: configFile,
  });
});
