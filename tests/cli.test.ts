// Runs the built entrypoint as a child process; c8 collects its coverage too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const CLI = new URL('../dist/cli.js', import.meta.url).pathname;

test('cli prints the package version', async () => {
  const pkg = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf-8'),
  ) as { version: string };
  const { stdout } = await run(process.execPath, [CLI, '--version']);
  assert.equal(stdout.trim(), pkg.version);
});

test('cli runs a command', async () => {
  const { stdout } = await run(process.execPath, [CLI, 'search', 'syntax']);
  assert.match(stdout, /^Query syntax/);
});

test('cli prints help without arguments', async () => {
  const { stdout } = await run(process.execPath, [CLI]);
  assert.match(stdout, /^Usage: marktguru /);
  assert.match(stdout, /Examples:/);
});
