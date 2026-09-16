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

test('verification covers the final edit and the report names its actual check', t => {
  const scenario = parseYaml(fs.readFileSync(path.join(__dirname, 'cases/verification-in-report.yaml'), 'utf8'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'simplify-workflow-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  for (const [target, source] of Object.entries(scenario.setup.fixtures)) {
    fs.copyFileSync(path.join(__dirname, source), path.join(cwd, target));
  }
  const check = () => {
    const result = spawnSync('bash', ['-c', scenario.checks[0].cmd], { cwd, encoding: 'utf8', timeout: 10000 });
    assert.ifError(result.error);
    return result.status === 0 && result.stdout.trim() === scenario.checks[0].expect_exact;
  };
  const source = 'export function firstPositive(values) { return values.find(value => value > 0); }\n';
  fs.writeFileSync(path.join(cwd, 'sloppy.mjs'), source);
  fs.writeFileSync(path.join(cwd, 'cleanup.md'), 'Removed redundant checks, preserving behavior; npm test passed.');
  assert.equal(check(), false, 'missing verification evidence must fail');
  const verified = spawnSync(process.execPath, ['verify.mjs'], { cwd, encoding: 'utf8', timeout: 10000 });
  assert.equal(verified.status, 0, verified.stderr);
  assert.equal(check(), true);
  fs.writeFileSync(path.join(cwd, 'sloppy.mjs'), source + '\n');
  assert.equal(check(), false, 'evidence for an earlier file state must fail');
  fs.writeFileSync(path.join(cwd, 'sloppy.mjs'), source);
  fs.writeFileSync(path.join(cwd, 'cleanup.md'), 'Removed redundant checks.');
  assert.equal(check(), false, 'a report without the command and result must fail');
  fs.writeFileSync(path.join(cwd, 'cleanup.md'), 'Behavior preserved; npm test passed.');
  fs.appendFileSync(path.join(cwd, 'verify.mjs'), '\n// Unauthorized change\n');
  assert.equal(check(), false, 'the verifier must remain unchanged');
});
