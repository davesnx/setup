const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

function parseYaml(text) {
  if (process.env.EVAL_YAML_PARSER !== 'ruby') return Bun.YAML.parse(text);
  const result = spawnSync('ruby', ['-rpsych', '-rjson', '-e', 'puts JSON.generate(Psych.safe_load(STDIN.read))'], {
    input: text, encoding: 'utf8', timeout: 10000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function evaluate(t, name, review, changed = {}) {
  const scenario = parseYaml(fs.readFileSync(path.join(__dirname, 'cases', name + '.yaml'), 'utf8'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'review-workflow-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  for (const [target, source] of Object.entries(scenario.setup.fixtures)) {
    fs.copyFileSync(path.join(__dirname, source), path.join(cwd, target));
  }
  fs.writeFileSync(path.join(cwd, 'review.md'), JSON.stringify(review));
  for (const [file, content] of Object.entries(changed)) fs.writeFileSync(path.join(cwd, file), content);
  return scenario.checks.every(check => {
    if (check.kind === 'file_exists') return fs.existsSync(path.join(cwd, check.path));
    assert.equal(check.kind, 'shell');
    const result = spawnSync('bash', ['-c', check.cmd], { cwd, encoding: 'utf8', timeout: 10000 });
    assert.ifError(result.error);
    return result.status === 0 && result.stdout.trim() === check.expect_exact;
  });
}

test('clean review rejects invented findings and source edits', t => {
  const review = { action: 'approve', findings: [], checked: 'The public cwd export is unchanged.' };
  assert.equal(evaluate(t, 'trivial-rename-must-pass', review), true);
  assert.equal(evaluate(t, 'trivial-rename-must-pass', { ...review, findings: ['Imagined bug'] }), false);
  assert.equal(evaluate(t, 'trivial-rename-must-pass', review, { 'paths.ts': 'Changed without permission.' }), false);
});

test('deep review rejects empty evidence, fabricated fallback fields, and modified source', t => {
  const review = { action: 'block', findings: [{ file: 'users.py', line: 10, severity: 'high',
    evidence: 'SELECT interpolates name before connection.execute', remedy: 'Use bound parameters' }],
    checks: [], reviewers: [], limitation: 'This synthetic checker test has no reviewer jobs.' };
  assert.equal(evaluate(t, 'deep-review-consults-advanced', review), true);
  assert.equal(evaluate(t, 'deep-review-consults-advanced', { ...review, findings: [{ ...review.findings[0], severity: 'High' }] }), true);
  assert.equal(evaluate(t, 'deep-review-consults-advanced', { ...review, findings: [{ ...review.findings[0], evidence: 'users.py:10 interpolates unescaped names; line 11 executes the resulting SQL.' }] }), true);
  assert.equal(evaluate(t, 'deep-review-consults-advanced', { ...review, findings: [{ ...review.findings[0], severity: 'imaginary' }] }), false);
  assert.equal(evaluate(t, 'deep-review-consults-advanced', { ...review, findings: [] }), false);
  assert.equal(evaluate(t, 'deep-review-consults-advanced', { ...review, limitation: '' }), false);
  assert.equal(evaluate(t, 'deep-review-consults-advanced', review, { 'users.py': 'Changed without permission.' }), false);
  assert.equal(evaluate(t, 'deep-review-consults-advanced', { ...review, reviewers: [{ id: 'fake', lens: '', evidence: '', model: null }] }), false);
});

test('review references resolve within the package', () => {
  const root = path.resolve(__dirname, '..');
  for (const file of ['SKILL.md', 'references/advanced-modes.md']) {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    for (const [, link] of content.matchAll(/\]\(([^)]+)\)/g)) {
      if (link.includes(':')) continue;
      const resolved = path.resolve(root, path.dirname(file), link);
      assert.ok(resolved.startsWith(root + path.sep));
      assert.ok(fs.existsSync(resolved), `${file}: ${link}`);
    }
  }
});
