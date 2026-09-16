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

function evaluate(t, name, outputs) {
  const scenario = parseYaml(fs.readFileSync(path.join(__dirname, 'cases', name + '.yaml'), 'utf8'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'comment-workflow-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  for (const [target, source] of Object.entries(scenario.setup.fixtures)) {
    fs.copyFileSync(path.join(__dirname, source), path.join(cwd, target));
  }
  for (const [file, content] of Object.entries(outputs)) fs.writeFileSync(path.join(cwd, file), content);
  return scenario.checks.every(check => {
    if (check.kind === 'file_exists') return fs.existsSync(path.join(cwd, check.path));
    assert.equal(check.kind, 'shell');
    const result = spawnSync('bash', ['-c', check.cmd], { cwd, encoding: 'utf8', timeout: 10000 });
    assert.ifError(result.error);
    return result.status === 0 && result.stdout.trim() === check.expect_exact;
  });
}

test('clear narration can be removed while code and protected comments remain', t => {
  const original = fs.readFileSync(path.join(__dirname, 'fixtures/format.mjs'), 'utf8');
  const source = original.replace('  // Trim the value and return it.\n', '');
  const outputs = { 'format.mjs': source, 'cleanup.md': 'Removed narration; protected comments remain.' };
  assert.equal(evaluate(t, 'straightforward-cleanup', outputs), true);
  for (const marker of ['// Copyright 2026 Example Authors. MIT License.\n', '/** Returns the trimmed display text. */\n', '// prettier-ignore\n']) {
    assert.equal(evaluate(t, 'straightforward-cleanup', { ...outputs, 'format.mjs': source.replace(marker, '') }), false);
  }
  assert.equal(evaluate(t, 'straightforward-cleanup', { ...outputs, 'format.mjs': source.replace('value.trim()', 'String(value)') }), false);
  assert.equal(evaluate(t, 'straightforward-cleanup', { ...outputs, 'format.mjs': original }), false);
});

test('an unresolved warning cannot be moved out of the source into a report', t => {
  const original = fs.readFileSync(path.join(__dirname, 'fixtures/normalize.mjs'), 'utf8');
  const source = original.replace('  // Convert the value to a string.\n', '');
  const outputs = { 'normalize.mjs': source, 'cleanup.md': 'The legacy importer constraint remains unresolved.' };
  assert.equal(evaluate(t, 'preserve-unresolved-warning', outputs), true);
  const removed = source.split('\n').filter(line => !line.includes('IMPORTANT')).join('\n');
  assert.equal(evaluate(t, 'preserve-unresolved-warning', { ...outputs, 'normalize.mjs': removed }), false);
});
