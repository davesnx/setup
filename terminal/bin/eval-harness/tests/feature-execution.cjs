const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const pkg = process.env.EVAL_TEST_PACKAGE || path.join(root, 'node_modules/@nano-step/eval-harness');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-features-'));
const script = path.join(pkg, 'scripts/eval');
const write = (name, content, mode = 0o644) => {
  const file = path.join(work, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { mode });
  return file;
};
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const env = {
  ...process.env,
  PATH: `${work}/bin:${root}/shims:${process.env.PATH}`,
  HOME: `${work}/home`,
  OPENCODE_SKILLS_ROOT: `${work}/skills`,
  OPENCODE_SKILLS_EXTRA_ROOT: '',
  OPENCODE_AUTH_FILE: `${work}/auth.json`,
  EVAL_STATE_DIR: `${work}/state`,
  EVAL_SKIP_AUTH_CHECK: '1',
  EVAL_LLM_JUDGE_LIVE: '0',
  EVAL_RUNNER: 'host',
  EVAL_AUTOFIX: '0',
  EVAL_REPETITIONS: '1',
  EVAL_STABILITY_SAMPLES: '1',
  EVAL_MODE: 'full',
  EVAL_MAX_SECONDS: '5',
  EVAL_BYPASS: '0',
  EVAL_WARN_ONLY: '0',
};
function command(name, args, extra = {}) {
  return spawnSync('bash', [path.join(script, name), ...args], {
    cwd: work, env: { ...env, ...extra }, encoding: 'utf8', timeout: 120000,
  });
}
function run(args = [], extra = {}) {
  const output = command('run.sh', ['--skill=demo', ...args], extra);
  assert.equal(output.signal, null, output.stderr);
  const id = /run_id=([^\s]+)/.exec(output.stdout)?.[1];
  return { output, id, dir: id && path.join(extra.EVAL_STATE_DIR || env.EVAL_STATE_DIR, 'runs', id) };
}
function good(run) {
  assert.equal(run.output.status, 0, `${run.output.stdout}\n${run.output.stderr}`);
  assert.ok(fs.existsSync(path.join(run.dir, '.finished')));
  return read(path.join(run.dir, 'results.json'));
}
function caseYaml(prompt = 'pass', checks = [{ kind: 'file_exists', path: 'answer.txt' }]) {
  return write('skills/demo/evals/cases/demo.yaml', JSON.stringify({
    id: 'demo', prompt, setup: { fixtures: { 'seed.txt': 'fixtures/seed.txt', 'delete.txt': 'fixtures/delete.txt' } }, checks,
  }));
}
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? files(name) : [name];
  });
}

try {
  write('auth.json', '{"test-secret":"not-for-retained-artifacts"}');
  write('skills/demo/SKILL.md', 'Use supporting instructions.');
  write('skills/demo/support/instructions.txt', 'support');
  write('skills/demo/evals/baselines/private.json', 'judge-only');
  write('skills/demo/evals/fixtures/seed.txt', 'original\n');
  write('skills/demo/evals/fixtures/delete.txt', 'present\n');
  write('skills/demo/evals/fixtures/check-transcript.cjs', 'throw new Error("old checker must not run");\n');
  const fake = write('bin/opencode', `#!/bin/sh
if [ "$1" = --version ]; then printf 'fake-opencode\n'; exit 0; fi
for argument do prompt="$argument"; done
test -f "$OPENCODE_CONFIG_DIR/skills/demo/SKILL.md" || exit 70
test -f "$OPENCODE_CONFIG_DIR/skills/demo/support/instructions.txt" || exit 70
test ! -e "$OPENCODE_CONFIG_DIR/skills/demo/evals" || exit 70
test "$(cat seed.txt)" = original || exit 71
test -f delete.txt || exit 71
test ! -e answer.txt || exit 71
printf 'mutated\n' > seed.txt
rm delete.txt
printf 'answer\n' > answer.txt
case "$prompt" in
  timeout) sleep 10 ;;
  error) exit 72 ;;
  later-error) case "$PWD" in *sample-2*) exit 73 ;; esac ;;
  later-failure) case "$PWD" in *sample-2*) rm answer.txt ;; esac ;;
esac
printf '{"type":"tool","part":{"tool":"skill","state":{"status":"completed","input":{"name":"technical-docs"}}}}\n'
printf '{"type":"text","part":{"text":"fresh inputs; %s"}}\n' "$prompt"
printf '{"type":"step_finish","part":{"reason":"stop","cost":0.01,"tokens":{"input":1,"output":2,"reasoning":0,"cache":{"read":0,"write":0}}}}\n'
`, 0o755);

  caseYaml();
  const repeated = run(['--repetitions=3', '--debug']);
  const result = good(repeated).cases[0];
  assert.equal(result.repetitions.total, 3);
  assert.equal(result.repetitions.success_rate, 1);
  assert.equal(result.stability.performed, false);
  assert.equal(result.metrics.tokens.input, 3);
  for (const attempt of ['', 'repetitions/sample-2', 'repetitions/sample-3']) {
    const directory = path.join(repeated.dir, 'demo', attempt);
    assert.match(fs.readFileSync(path.join(directory, 'transcript.jsonl'), 'utf8'), /fresh inputs/);
    assert.equal(fs.readFileSync(path.join(directory, 'workdir/seed.txt'), 'utf8'), 'mutated\n');
    assert.ok(!fs.existsSync(path.join(directory, 'workdir/delete.txt')));
    assert.ok(!fs.existsSync(path.join(directory, 'sandbox/opencode/skills/demo/evals')));
  }
  assert.equal(fs.readFileSync(path.join(repeated.dir, 'demo/inputs/seed.txt'), 'utf8'), 'original\n');
  assert.ok(fs.existsSync(path.join(repeated.dir, 'demo/inputs/delete.txt')));
  assert.ok(!files(repeated.dir).some(file => fs.readFileSync(file).includes('not-for-retained-artifacts')));
  assert.equal(command('cleanup.sh', [`--run=${repeated.id}`]).status, 0);
  assert.ok(!fs.existsSync(path.join(repeated.dir, 'demo/repetitions/sample-2/sandbox')));

  caseYaml('fail', [{ kind: 'file_exists', path: 'missing.txt' }]);
  const stability = run(['--stability-samples=3']);
  assert.ok([0, 12].includes(stability.output.status), stability.output.stderr);
  const stableResult = read(path.join(stability.dir, 'results.json')).cases[0];
  assert.equal(stableResult.stability.samples, 3);
  assert.equal(stableResult.stability.byte_identical, true);
  assert.equal(stableResult.stability.harness_error, false);
  assert.equal(stableResult.repetitions.total, 1);
  assert.match(fs.readFileSync(path.join(stability.dir, 'demo/stability/sample-3/transcript.jsonl'), 'utf8'), /fresh inputs/);

  caseYaml('later-failure');
  const laterFailure = run(['--repetitions=3']);
  assert.equal(laterFailure.output.status, 12, laterFailure.output.stderr);
  const failedCase = read(path.join(laterFailure.dir, 'results.json')).cases[0];
  assert.equal(failedCase.passed, false);
  assert.equal(failedCase.checks[0].passed, true, 'primary check must stay unchanged');
  assert.equal(failedCase.repetitions.success_count, 2);
  assert.equal(failedCase.repetitions.harness_error, false);
  assert.deepEqual(failedCase.repetitions.attempts.map(attempt => attempt.exit_code), [0, 0, 0]);
  assert.equal(failedCase.repetitions.attempts[1].checks[0].failed_check_id, 'file_exists:answer.txt');
  assert.equal(failedCase.repetitions.attempts[1].checks[0].actual, 'missing');
  const failureMarkdown = fs.readFileSync(path.join(laterFailure.dir, 'diff.md'), 'utf8');
  assert.match(failureMarkdown, /demo \/ attempt 2 \(repetitions\/sample-2\)/);
  assert.match(failureMarkdown, /file_exists:answer.txt/);
  assert.match(failureMarkdown, /expected: `file present`/);
  assert.match(failureMarkdown, /actual: `missing`/);

  caseYaml('later-error');
  const errored = run(['--repetitions=3']);
  assert.equal(errored.output.status, 13, errored.output.stderr);
  const errors = read(path.join(errored.dir, 'results.json')).cases[0].repetitions;
  assert.equal(errors.success_count, 2);
  assert.equal(errors.harness_error, true);
  assert.deepEqual(errors.attempts.map(attempt => attempt.exit_code), [0, 73, 0]);
  assert.ok(!fs.existsSync(path.join(errored.dir, 'demo/repetitions/sample-2/sandbox')));
  assert.equal(run(['--repetitions=2', '--stability-samples=2']).output.status, 2);
  assert.equal(run(['--repetitions=0']).output.status, 2);
  assert.equal(run(['--repetitions=2', '--mode=2tier']).output.status, 2);

  // Regrading current checks must not execute the candidate or change saved evidence.
  const before = new Map(files(repeated.dir).map(file => [file, fs.readFileSync(file)]));
  fs.unlinkSync(fake);
  caseYaml('pass', [{ kind: 'file_exists', path: 'missing.txt' }]);
  const regraded = command('regrade.sh', [`--run=${repeated.id}`, '--case=demo'], { OPENCODE_AUTH_FILE: '', ANTHROPIC_API_KEY: '' });
  assert.equal(regraded.status, 12, regraded.stderr);
  const reportFile = /regrade report: (.*\/report.json)/.exec(regraded.stdout)[1];
  const report = read(reportFile);
  assert.equal(report.source_run, repeated.id);
  assert.equal(report.case_id, 'demo');
  assert.equal(report.candidate_invoked, false);
  assert.equal(report.cost_usd, null);
  assert.equal(report.attempts.length, 3);
  assert.equal(report.passed, false);
  const warned = command('regrade.sh', [`--run=${repeated.id}`, '--case=demo'], { EVAL_WARN_ONLY: '1' });
  assert.equal(warned.status, 0, warned.stderr);
  assert.equal(read(/regrade report: (.*\/report.json)/.exec(warned.stdout)[1]).passed, false);
  assert.match(warned.stderr, /EVAL_WARN_ONLY=1/);
  for (const [file, content] of before) assert.deepEqual(fs.readFileSync(file), content);

  caseYaml();
  assert.equal(command('regrade.sh', [`--run=${repeated.id}`, '--case=demo']).status, 0);
  write('skills/demo/evals/fixtures/current.txt', 'current-fixture');
  write('skills/demo/evals/fixtures/check-transcript.cjs', String.raw`
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const events = fs.readFileSync('../transcript.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
assert.ok(events.some(event => event.part?.text?.includes('fresh inputs')));
assert.equal(fs.readFileSync(path.join(process.env.EVAL_FIXTURE_DIR, 'current.txt'), 'utf8'), 'current-fixture');
process.stdout.write('current checker: transcript ready');
`);
  const routingCase = require(path.join(root, 'node_modules/yaml')).parse(fs.readFileSync(
    path.resolve(root, '../../../agents/skills/technical-docs/evals/cases/routes-developer-docs-only.yaml'), 'utf8',
  ));
  caseYaml('pass', [routingCase.checks[0], {
    kind: 'shell', unsafe_shell: true, cmd: 'node "$EVAL_FIXTURE_DIR/check-transcript.cjs"',
    expect_exact: 'current checker: transcript ready',
  }]);
  const transcriptChecks = command('regrade.sh', [`--run=${repeated.id}`, '--case=demo']);
  assert.equal(transcriptChecks.status, 0, transcriptChecks.stderr);
  const layoutReportFile = /regrade report: (.*\/report.json)/.exec(transcriptChecks.stdout)[1];
  const layoutReportDir = path.dirname(layoutReportFile);
  const layoutReport = read(layoutReportFile);
  for (const [index, attempt] of layoutReport.attempts.entries()) {
    assert.equal(attempt.directory, `attempts/${index + 1}`);
    const directory = path.join(layoutReportDir, attempt.directory);
    assert.ok(fs.existsSync(path.join(directory, 'workdir')));
    assert.ok(fs.existsSync(path.join(directory, 'transcript.jsonl')));
    assert.ok(fs.existsSync(path.join(directory, 'exit-code')));
    assert.deepEqual(read(path.join(directory, 'checks.json')).checks.map(check => check.actual), ['ready', 'current checker: transcript ready']);
  }
  // Current shell checks can mutate only the regrading copy.
  caseYaml('pass', [{ kind: 'shell', unsafe_shell: true, cmd: 'rm answer.txt ../transcript.jsonl; echo changed', expect_exact: 'changed' }]);
  const mutatedCopy = command('regrade.sh', [`--run=${repeated.id}`, '--case=demo']);
  assert.equal(mutatedCopy.status, 0, mutatedCopy.stderr);
  const mutationReportDir = path.dirname(/regrade report: (.*\/report.json)/.exec(mutatedCopy.stdout)[1]);
  assert.ok(!fs.existsSync(path.join(mutationReportDir, 'attempts/1/transcript.jsonl')));
  for (const [file, content] of before) {
    assert.deepEqual(fs.readFileSync(file), content);
    if (path.basename(file) === '.finished' || path.basename(file) === 'evidence.json') continue;
    assert.deepEqual(fs.readFileSync(path.join(mutationReportDir, 'source', path.relative(repeated.dir, file))), content);
  }
  assert.equal(fs.readFileSync(path.join(repeated.dir, 'demo/workdir/answer.txt'), 'utf8'), 'answer\n');
  // Use the existing judge seam, never a live provider.
  write('bin/curl', '#!/bin/sh\nprintf \'{"content":[{"text":"PASS"}]}\\n\'\n', 0o755);
  caseYaml('pass', [{ kind: 'llm_judge', rubric: 'New rubric', target_file: 'answer.txt', samples: 1 }]);
  const judged = command('regrade.sh', [`--run=${repeated.id}`, '--case=demo'], {
    EVAL_LLM_JUDGE_LIVE: '1', ANTHROPIC_API_KEY: 'fake-judge-key-not-a-real-key',
  });
  assert.equal(judged.status, 0, judged.stderr);
  assert.equal(command('regrade.sh', [`--run=${repeated.id}`, '--case=demo'], { ANTHROPIC_API_KEY: '' }).status, 13);
  assert.equal(command('regrade.sh', [`--run=${repeated.id}`, '--case=demo'], { ANTHROPIC_API_KEY: '', EVAL_WARN_ONLY: '1' }).status, 13);
  caseYaml('pass', [{ kind: 'shell', unsafe_shell: true, cmd: 'sleep 10', expect_exact: 'ready' }]);
  assert.equal(command('regrade.sh', [`--run=${repeated.id}`, '--case=demo'], { EVAL_CHECK_TIMEOUT_SECONDS: '1', EVAL_WARN_ONLY: '1' }).status, 13);
  caseYaml();
  assert.equal(command('regrade.sh', ['--run=../escape', '--case=demo']).status, 13);
  assert.equal(command('regrade.sh', [`--run=${repeated.id}`, '--case=../escape']).status, 2);
  assert.equal(command('regrade.sh', [`--run=${repeated.id}`, '--case=other']).status, 13);
  assert.equal(command('regrade.sh', [`--run=${errored.id}`, '--case=demo']).status, 13);
  fs.writeFileSync(path.join(repeated.dir, '.active'), '');
  assert.equal(command('regrade.sh', [`--run=${repeated.id}`, '--case=demo']).status, 13);
  fs.unlinkSync(path.join(repeated.dir, '.active'));
  fs.symlinkSync(repeated.dir, path.join(env.EVAL_STATE_DIR, 'runs', 'linked-run'));
  assert.equal(command('regrade.sh', ['--run=linked-run', '--case=demo']).status, 13);
  fs.appendFileSync(path.join(repeated.dir, 'demo/workdir/answer.txt'), 'tampered');
  const tampered = command('regrade.sh', [`--run=${repeated.id}`, '--case=demo']);
  assert.equal(tampered.status, 13);
  assert.equal(command('regrade.sh', [`--run=${repeated.id}`, '--case=demo'], { EVAL_WARN_ONLY: '1' }).status, 13);
  assert.match(tampered.stderr, /checksum mismatch/);
  fs.writeFileSync(path.join(repeated.dir, 'demo/workdir/answer.txt'), 'answer\n');
  fs.symlinkSync(work, path.join(repeated.dir, 'demo/workdir/escape'));
  assert.equal(command('regrade.sh', [`--run=${repeated.id}`, '--case=demo']).status, 13);
  fs.unlinkSync(path.join(repeated.dir, 'demo/workdir/escape'));
  fs.unlinkSync(path.join(repeated.dir, 'demo/transcript.jsonl'));
  assert.equal(command('regrade.sh', [`--run=${repeated.id}`, '--case=demo']).status, 13);
  // Even a matching seal cannot make an incomplete transcript valid.
  const incomplete = '{"type":"text","part":{"text":"unfinished"}}\n';
  fs.writeFileSync(path.join(repeated.dir, 'demo/transcript.jsonl'), incomplete);
  const seal = read(path.join(repeated.dir, 'evidence.json'));
  seal.files['demo/transcript.jsonl'] = createHash('sha256').update(incomplete).digest('hex');
  fs.writeFileSync(path.join(repeated.dir, 'evidence.json'), JSON.stringify(seal));
  const incompleteRun = command('regrade.sh', [`--run=${repeated.id}`, '--case=demo']);
  assert.equal(incompleteRun.status, 13);
  assert.match(incompleteRun.stderr, /incomplete transcript/);
  console.log('PASS: fresh attempts, failure rechecks, error recovery, filtered skills, and copy-only regrading');
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
