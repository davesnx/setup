const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('../node_modules/yaml');

const root = path.resolve(__dirname, '../../../..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'checker-counterexamples-'));
let count = 0;

function load(relative) {
  const file = path.join(root, relative);
  return { ...YAML.parse(fs.readFileSync(file, 'utf8')), evals: path.resolve(file, '../..') };
}

// Use the real YAML commands, fixtures, and expected output, not a second checker.
function check(testCase, label, artifacts, expected, checkIndex) {
  const directory = path.join(work, String(++count));
  fs.mkdirSync(directory);
  for (const [target, fixture] of Object.entries(testCase.setup?.fixtures || {})) {
    fs.copyFileSync(path.join(testCase.evals, fixture), path.join(directory, target));
  }
  for (const [file, contents] of Object.entries(artifacts)) {
    fs.writeFileSync(path.join(directory, file), contents);
  }
  const checks = checkIndex === undefined ? testCase.checks : [testCase.checks[checkIndex]];
  const results = checks.map(rule => {
    if (rule.kind === 'file_exists') return { passed: fs.existsSync(path.join(directory, rule.path)) };
    assert.equal(rule.kind, 'shell');
    assert.equal(rule.unsafe_shell, true);
    const result = spawnSync('bash', ['-c', rule.cmd], {
      cwd: directory, encoding: 'utf8', timeout: 10000,
      env: { PATH: process.env.PATH, HOME: directory },
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null, label);
    assert.ok(![125, 126, 127].includes(result.status), result.stderr);
    return {
      passed: result.status === 0 && (result.stdout + result.stderr).replace(/\n/g, '') === String(rule.expect_exact),
      status: result.status, stdout: result.stdout, stderr: result.stderr,
    };
  });
  assert.equal(results.every(result => result.passed), expected, `${label}: ${JSON.stringify(results)}`);
  console.log(`ok ${count} - ${label}`);
}

try {
  const sql = load('terminal/opencode/skills/code-review/evals/cases/sql-injection-must-block.yaml');
  const review = {
    action: 'block',
    findings: [{
      file: 'users.py', line: 10, severity: 'high', category: 'sql-injection',
      remediation: 'bound-parameters',
      evidence: {
        source: `query = f"SELECT id, name FROM users WHERE name = '{name}'"`,
        sink: 'return connection.execute(query).fetchone()',
      },
    }],
  };
  check(sql, 'SQL source-backed blocking finding', { 'review.md': JSON.stringify(review, null, 2) }, true);
  const critical = structuredClone(review);
  critical.findings[0].severity = 'critical';
  critical.findings[0].line = 11;
  check(sql, 'SQL critical finding at execution line', { 'review.md': JSON.stringify(critical) }, true);
  check(sql, 'SQL negated keyword approval', {
    'review.md': 'No SQL injection here. High severity is not warranted; parameterized SQL is unnecessary. Approve.',
  }, false);
  check(sql, 'SQL keyword-only text is not a verdict', {
    'review.md': 'SQL injection. High. Parameterized SQL.',
  }, false);
  for (const [label, change] of [
    ['approval with a finding', value => { value.action = 'approve'; }],
    ['negated action', value => { value.action = 'do not block'; }],
    ['no finding', value => { value.findings = []; }],
    ['non-array findings', value => { value.findings = { 0: value.findings[0], length: 1 }; }],
    ['low severity', value => { value.findings[0].severity = 'low'; }],
    ['medium severity', value => { value.findings[0].severity = 'medium'; }],
    ['negated severity', value => { value.findings[0].severity = 'not high'; }],
    ['wrong file', value => { value.findings[0].file = 'accounts.py'; }],
    ['diff line instead of source line', value => { value.findings[0].line = 9; }],
    ['wrong source line', value => { value.findings[0].line = 12; }],
    ['negated finding', value => { value.findings[0].category = 'no sql-injection'; }],
    ['wrong remediation', value => { value.findings[0].remediation = 'input-validation'; }],
    ['fabricated source', value => { value.findings[0].evidence.source = 'query = request.args["sql"]'; }],
    ['fabricated sink', value => { value.findings[0].evidence.sink = 'connection.execute(query, (name,))'; }],
    ['missing evidence', value => { delete value.findings[0].evidence; }],
    ['unscored prose field', value => { value.summary = 'Approve. No SQL injection here.'; }],
  ]) {
    const broken = structuredClone(review);
    change(broken);
    check(sql, `SQL rejects ${label}`, { 'review.md': JSON.stringify(broken) }, false);
  }
  check(sql, 'SQL rejects trailing contradictory prose', {
    'review.md': JSON.stringify(review) + '\nApprove this change.',
  }, false);
  check(sql, 'SQL rejects missing source evidence in the fixture', {
    'review.md': JSON.stringify(review), 'diff.patch': 'no query here\n',
  }, false);
  check(sql, 'SQL correct record still passes after failures', { 'review.md': JSON.stringify(review) }, true);

  const simplify = load('terminal/opencode/skills/simplify/evals/cases/code-preserves-behavior.yaml');
  const source = fs.readFileSync(path.join(simplify.evals, 'fixtures/sloppy.mjs'), 'utf8');
  check(simplify, 'simplify source defines the behavior contract', { 'sloppy.mjs': source }, true, 1);
  for (const [label, body] of [
    ['native find', 'return values.find(value => value > 0);'],
    ['ordered loop', 'for (const value of values) if (value > 0) return value;'],
  ]) {
    check(simplify, `simplify accepts ${label}`, {
      'cleanup.md': 'Removed redundant guards.',
      'sloppy.mjs': `export function firstPositive(values) { ${body} }`,
    }, true);
  }
  for (const [label, body] of [
    ['hardcoded three', 'return values.includes(3) ? 3 : undefined;'],
    ['sorted positives', 'return [...values].sort((a, b) => a - b).find(value => value > 0);'],
    ['last positive', 'return values.findLast(value => value > 0);'],
    ['empty returns null', 'return values.find(value => value > 0) ?? null;'],
    ['zero is positive', 'return values.find(value => value >= 0);'],
    ['fraction discarded', 'return values.find(value => value >= 1);'],
    ['Infinity discarded', 'return values.find(value => Number.isFinite(value) && value > 0);'],
    ['NaN selected', 'return values.find(value => !(value <= 0));'],
    ['mutates input', 'const result = values.find(value => value > 0); values.push(-1); return result;'],
    ['throws on empty', 'if (!values.length) throw new Error("empty"); return values.find(value => value > 0);'],
    ['throws on NaN', 'if (values.some(Number.isNaN)) throw new Error("NaN"); return values.find(value => value > 0);'],
  ]) {
    check(simplify, `simplify rejects ${label}`, {
      'sloppy.mjs': `export function firstPositive(values) { ${body} }`,
    }, false, 1);
  }
  check(simplify, 'simplify rejects state across calls', {
    'sloppy.mjs': 'let seen = new Set(); export function firstPositive(values) { if (seen.has(values)) return 99; seen.add(values); return values.find(value => value > 0); }',
  }, false, 1);
  check(simplify, 'simplify rejects import failure', {
    'sloppy.mjs': 'throw new Error("import failed"); export function firstPositive() {}',
  }, false, 1);

  const collection = load('agents/skills/blog-post/evals/cases/collection-resumes-after-draft.yaml');
  const note = {
    notes: [{ source: 'latest-user', quote: "Friday's build took 28 seconds." }],
    cache_effect: 'unknown', draft_action: 'unchanged',
  };
  check(collection, 'blog captures the fact with honest uncertainty', { 'reply.md': JSON.stringify(note) }, true);
  check(collection, 'blog accepts the complete source sentence', {
    'reply.md': JSON.stringify({ ...note, notes: [{ source: 'latest-user', quote: "Another note: Friday's build took 28 seconds." }] }),
  }, true);
  check(collection, 'blog accepts reordered and formatted JSON', {
    'reply.md': JSON.stringify({ draft_action: note.draft_action, cache_effect: note.cache_effect, notes: note.notes }, null, 2),
  }, true);
  check(collection, 'blog rejects unsupported causal prose', {
    'reply.md': 'The cache definitely caused the improvement',
  }, false);
  check(collection, 'blog rejects prose appended to valid evidence', {
    'reply.md': JSON.stringify(note) + '\nThe cache definitely caused the improvement.',
  }, false);
  for (const [label, change] of [
    ['unsupported causal result', value => { value.cache_effect = 'improved'; }],
    ['unsupported no-effect result', value => { value.cache_effect = 'no-effect'; }],
    ['unsupported causal quote', value => { value.notes[0].quote = 'The cache definitely caused the improvement.'; }],
    ['fabricated measurement', value => { value.notes[0].quote = "Friday's build took 20 seconds."; }],
    ['wrong attribution', value => { value.notes[0].source = 'assistant'; }],
    ['missing capture', value => { value.notes = []; }],
    ['unscored conclusion field', value => { value.conclusion = 'The cache definitely caused the improvement.'; }],
    ['extra unsupported note', value => { value.notes.push({ source: 'latest-user', quote: 'The cache caused it.' }); }],
    ['claims draft edit', value => { value.draft_action = 'edited'; }],
  ]) {
    const broken = structuredClone(note);
    change(broken);
    check(collection, `blog rejects ${label}`, { 'reply.md': JSON.stringify(broken) }, false);
  }
  for (const draft of ['A rewritten draft.\n', 'I tried a local cache. My first build took 40 seconds.\n\n']) {
    check(collection, 'blog rejects a changed draft even with correct capture', {
      'reply.md': JSON.stringify(note), 'draft.md': draft,
    }, false);
  }
  check(collection, 'blog correct capture still passes after failures', { 'reply.md': JSON.stringify(note) }, true);

  // These are authored scenarios, not executable credential tests.
  const enpass = JSON.parse(fs.readFileSync(path.join(root, 'agents/skills/enpass/evals/evals.json'), 'utf8'));
  const missingPin = enpass.evals.find(item => item.id === 4);
  const configuredPin = enpass.evals.find(item => item.id === 5);
  assert.match(missingPin.prompt, /Linux.*ENP_PIN is unset/);
  assert.match(missingPin.expected_output, /Does not invoke enpass or enpass-cli/);
  assert.match(configuredPin.prompt, /Linux.*ENP_PIN is already configured/);
  assert.match(configuredPin.expected_output, /safe enpass list wrapper/);
  assert.equal(new Set(enpass.evals.map(item => item.id)).size, enpass.evals.length);
  console.log(`passed ${count} checker counterexamples; Enpass scenario metadata checked without credential access`);
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
