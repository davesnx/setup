import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const fixture = (skill, file) => readFileSync(resolve(root,
  `terminal/opencode/skills/${skill}/evals/fixtures/${file}`), 'utf8');
const read = (file) => readFileSync(file, 'utf8');
const nonempty = (file) => assert.ok(read(file).trim(), `${file} is empty`);
const unchanged = (file, skill, original) => assert.equal(read(file), fixture(skill, original));

// Artifact checks run outside the candidate's tool loop. Reference content and
// these checks are never copied into the candidate workspace or skill bundle.
switch (process.argv[2]) {
  case 'review-sql': {
    unchanged('diff.patch', 'code-review', 'sql-injection.diff');
    const result = JSON.parse(read('review.json'));
    assert.equal(result.action, 'block');
    assert.equal(result.findings.length, 1);
    const finding = result.findings[0];
    assert.equal(finding.file, 'users.py');
    assert.ok([10, 11].includes(finding.line));
    assert.ok(['high', 'critical'].includes(finding.severity));
    assert.equal(finding.category, 'sql-injection');
    assert.equal(finding.remediation, 'bound-parameters');
    assert.deepEqual(finding.evidence, {
      source: `query = f"SELECT id, name FROM users WHERE name = '{name}'"`,
      sink: 'return connection.execute(query).fetchone()',
    });
    break;
  }
  case 'review-clean': {
    unchanged('diff.patch', 'code-review', 'trivial-rename.diff');
    const result = JSON.parse(read('review.json'));
    assert.equal(result.action, 'approve');
    assert.deepEqual(result.findings, []);
    break;
  }
  case 'simplify-behavior': {
    nonempty('cleanup.md');
    const { firstPositive } = await import(pathToFileURL(resolve('sloppy.mjs')));
    const cases = [
      [[], undefined], [[-2, 0], undefined], [[-Infinity, NaN, -0], undefined],
      [[-2, 0, 3, 4], 3], [[4, 3, 0, -2], 4], [[-1, 7, 2], 7],
      [[2, 7, -1], 2], [[NaN, -0, 0.125, 9], 0.125],
      [[-Infinity, Infinity, 2], Infinity], [[2, Infinity, NaN], 2],
      [[Number.MIN_VALUE, 1], Number.MIN_VALUE],
    ];
    for (const [values, expected] of [...cases, ...cases.toReversed()]) {
      const before = values.slice();
      assert.equal(firstPositive(values), expected);
      assert.deepEqual(values, before, 'input was mutated');
    }
    break;
  }
  case 'simplify-shape': {
    const source = read('sloppy.mjs');
    for (const pattern of [/\btry\s*\{/, /\bArray\s*\.\s*isArray\b/, /\btypeof\b/]) {
      assert.ok(!pattern.test(source), `Trusted-path scaffolding remains: ${pattern}`);
    }
    assert.ok(source.length < fixture('simplify', 'sloppy.mjs').length);
    break;
  }
  case 'simplify-readonly':
    unchanged('bloated.mjs', 'simplify', 'bloated.mjs');
    assert.deepEqual(readdirSync('.').filter(f => /\.(?:mjs|js|ts)$/.test(f)), ['bloated.mjs']);
    nonempty('review.md');
    assert.match(read('review.md'), /NameFormatter/);
    assert.match(read('review.md'), /trim/);
    // These anchors are not a semantic grade. This case also requires human review.
    break;
  default:
    throw new Error(`Unknown checker: ${process.argv[2]}`);
}
console.log('passed');
