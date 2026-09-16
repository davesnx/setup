const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../../..');
const harness = path.join(root, 'terminal/bin/eval-harness');
const YAML = require(path.join(harness, 'node_modules/yaml'));
const scorer = path.join(harness, 'node_modules/@nano-step/eval-harness/scripts/eval/lib/score.sh');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'review-skill-checkers-'));
const completion = 'The task is complete and all tests passed.';
let count = 0;

function grade(relative, label, text, artifacts, expected, extraEvents = [], pretty = false) {
  const caseFile = path.join(root, relative);
  const data = YAML.parse(fs.readFileSync(caseFile, 'utf8'));
  const directory = path.join(work, String(++count));
  const workdir = path.join(directory, 'workdir');
  fs.mkdirSync(workdir, { recursive: true });
  for (const [target, fixture] of Object.entries(data.setup?.fixtures || {})) {
    fs.copyFileSync(path.resolve(caseFile, '../..', fixture), path.join(workdir, target));
  }
  for (const [target, content] of Object.entries(artifacts)) {
    fs.writeFileSync(path.join(workdir, target), content);
  }
  const events = [
    { type: 'step_start' },
    ...extraEvents,
    { type: 'text', part: { type: 'text', text } },
    { type: 'step_finish', part: { reason: 'stop' } },
  ];
  const transcript = path.join(directory, 'transcript.jsonl');
  fs.writeFileSync(transcript, events.map(event => {
    const json = JSON.stringify(event);
    return pretty ? json.replaceAll(':', ': ').replaceAll(',', ', ') : json;
  }).join('\n') + '\n');
  const output = path.join(directory, 'checks.json');
  const result = spawnSync('bash', ['-c',
    'source "$1"; run_all_checks "$2" "$3" "$4" "$5"',
    'grade', scorer, caseFile, workdir, transcript, output], {
    encoding: 'utf8', timeout: 30000,
    env: { ...process.env, PATH: `${harness}/shims:${process.env.PATH}`,
      EVAL_AUTOFIX: '0', EVAL_SPAWN_EXIT_CODE: '0', EVAL_CHECK_TIMEOUT_SECONDS: '10' },
  });
  assert.equal(result.status, 0, `${label}: ${result.error || result.stderr}`);
  const report = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(report.total, data.checks.length, label);
  assert.ok(report.checks.every(check => !check.error), `${label}: ${JSON.stringify(report)}`);
  assert.equal(report.passed, expected, `${label}: ${JSON.stringify(report)}`);
  console.log(`ok ${count} - ${label}`);
}

const simplify = 'terminal/opencode/skills/simplify/evals/cases/ordinary-edit-no-cleanup.yaml';
const source = fs.readFileSync(path.join(root, 'terminal/opencode/skills/simplify/evals/fixtures/profile.html'), 'utf8');
const changed = source.replace('<title>Profile</title>', '<title>Account</title>');
grade(simplify, 'accept complete title-only edit', completion, { 'profile.html': changed }, true);
grade(simplify, 'reject title-only remnant', completion, { 'profile.html': '<title>Account</title>' }, false);
grade(simplify, 'reject removed form', completion, { 'profile.html': changed.replace(/    <form>[\s\S]*?    <\/form>\n/, '') }, false);
grade(simplify, 'reject unrelated edit', completion, { 'profile.html': changed.replace('>Save<', '>Submit<') }, false);
grade(simplify, 'reject unchanged title', completion, {}, false);
grade(simplify, 'reject automatic skill pass', completion, { 'profile.html': changed }, false,
  [{ type: 'tool_use', part: { type: 'tool', tool: 'skill', state: { input: { name: 'simplify' } } } }]);
grade(simplify, 'accept correct edit after failures', completion, { 'profile.html': changed }, true);

const reflect = 'agents/skills/reflect/evals/cases/completion-is-not-trigger.yaml';
grade(reflect, 'accept completion only', completion, {}, true);
grade(reflect, 'accept spaced JSON events', completion, {}, true, [], true);
grade(reflect, 'reject inline reflection without skill call',
  'Reflection: the correction taught us to check command flags before running tests.', {}, false);
grade(reflect, 'reject completion followed by reflection',
  completion + ' I learned to check command flags first.', {}, false);
grade(reflect, 'reject empty completion', '', {}, false);
for (const tool of ['read', 'task', 'apply_patch', 'skill', 'bash', 'unknown-tool']) {
  grade(reflect, `reject ${tool} even with correct completion`, completion, {}, false,
    [{ type: 'tool_use', part: { type: 'tool', tool, state: { input: {} } } }], true);
}
grade(reflect, 'reject tool part hidden in text event', completion, {}, false,
  [{ type: 'text', part: { type: 'tool', tool: 'read', text: '' } }]);
grade(reflect, 'accept completion after failures', completion, {}, true);
console.log(`Passed ${count} cases through run_all_checks. Synthetic evidence only; no model or Reflect execution.`);
console.log(`Graded artifacts: ${work}`);
