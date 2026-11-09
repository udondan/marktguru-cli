import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuery } from '../dist/query.js';

test('buildQuery builds a structured query', () => {
  const { query, warnings } = buildQuery({
    terms: ['milch'],
    phrases: ['frische milch'],
    wildcards: ['bio*'],
    ors: ['soja', 'hafer'],
    groups: ['(milch OR sahne)'],
  });

  assert.equal(
    query,
    'milch "frische milch" bio* (soja OR hafer) ((milch OR sahne))',
  );
  assert.deepEqual(warnings, []);
});

test('buildQuery warns on wildcard with whitespace', () => {
  const { query, warnings } = buildQuery({
    wildcards: ['bio milch'],
  });

  assert.equal(query, '"bio milch"');
  assert.equal(warnings.length, 1);
});

test('buildQuery quotes multi-word terms and escapes quotes', () => {
  const { query } = buildQuery({
    terms: ['erdnuss snips', 'say "hi"'],
    ors: ['a b', 'c'],
  });

  assert.equal(query, '"erdnuss snips" "say \\"hi\\"" ("a b" OR c)');

  assert.equal(
    buildQuery({ phrases: ['say "hi" \\o/'] }).query,
    '"say \\"hi\\" \\\\o/"',
  );
});

test('buildQuery throws on empty input', () => {
  assert.throws(() => buildQuery({}), /No query parts provided/);
});

test('buildQuery ignores blank values', () => {
  assert.throws(
    () =>
      buildQuery({
        terms: [' '],
        phrases: [''],
        wildcards: ['  '],
        ors: [' '],
        groups: [''],
      }),
    /No query parts provided/,
  );
});
