// Live end-to-end tests: these hit marktguru.at/.de and api.marktguru.* for
// real, so they catch the scraper breaking when Marktguru ships a new frontend.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const CLI = new URL('../dist/cli.js', import.meta.url).pathname;

const COUNTRIES = [
  { country: 'at', zip: '1010' },
  { country: 'de', zip: '10115' },
];

for (const { country, zip } of COUNTRIES) {
  test(
    `live: login and search in ${country}`,
    { timeout: 120000 },
    async () => {
      // Isolated HOME so the test never reads or writes a real ~/.marktguru.
      const home = await mkdtemp(join(tmpdir(), 'marktguru-live-'));
      const cli = (...args) =>
        run(process.execPath, [CLI, ...args], {
          env: { ...process.env, HOME: home, USERPROFILE: home },
        });
      try {
        await cli('set-country', country);

        // No key is stored yet, so search has to auto-login by scraping.
        const { stdout } = await cli(
          'search',
          'raw',
          'milch',
          '--zip',
          zip,
          '--limit',
          '5',
          '--json',
        );
        const data = JSON.parse(stdout);

        assert.ok(data.total > 0, `no results for "milch" in ${country}`);
        assert.ok(data.offers.length > 0);
        assert.ok(data.offers.length <= 5);
        for (const offer of data.offers) {
          assert.equal(typeof offer.title, 'string');
          assert.equal(typeof offer.price, 'number');
        }
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
  );
}
