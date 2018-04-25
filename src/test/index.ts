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

function sortById(a: MatchResultReason, b: MatchResultReason) {
  return (
    Number(a.propertyPath > b.propertyPath) -
    Number(a.propertyPath < b.propertyPath)
  );
}
