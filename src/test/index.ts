import test from 'ava';
import * as fs from 'fs';
import * as path from 'path';
import { match, MatchResultReason } from '../';

/**
 *
 * run all test cases
 *
 */

const CASE_DIR = path.join(__dirname, './cases');
const cases = fs.readdirSync(CASE_DIR);

cases.filter(d => !/\.d\.ts$/.test(d)).forEach(file => {
  const name = file.replace('.js', '');
  test(`match-test: ${name}`, t => {
    const { doc, query, matches, reasons } = require(path.join(CASE_DIR, file));
    const result = match(query, doc);
    t.is(result.match, matches, `${name} test should produce ${matches}`);
    if (reasons) {
      t.deepEqual(reasons.sort(sortById), result.reasons.sort(sortById));
    }
  });
});

test('can filter arrays with curried match()', t => {
  const docs = [
    { id: 1, name: 'Amanda' },
    { id: 2, name: 'Ben' },
    { id: 3, name: 'Chris' }
  ];

  const queryFunction = match({
    $or: [{ name: /A/ }, { id: 2 }]
  });

  const filtered = docs.filter(queryFunction);

  t.is(filtered.length, 2);
  t.deepEqual(filtered, docs.slice(0, 2));
});

function sortById(a: MatchResultReason, b: MatchResultReason) {
  return (
    Number(a.propertyPath > b.propertyPath) -
    Number(a.propertyPath < b.propertyPath)
  );
}
