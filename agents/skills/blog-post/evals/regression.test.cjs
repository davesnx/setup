const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const root = path.resolve(__dirname, '../../../..');
const YAML = require(path.join(root, 'terminal/bin/eval-harness/node_modules/yaml'));

function load(skill, name) {
  const directory = path.join(root, 'agents/skills', skill, 'evals');
  return { ...YAML.parse(fs.readFileSync(path.join(directory, 'cases', `${name}.yaml`), 'utf8')), directory };
}

function check(t, scenario, artifacts) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'writing-regression-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  for (const [name, source] of Object.entries(scenario.setup?.fixtures || {})) {
    const destination = path.join(cwd, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(scenario.directory, source), destination);
  }
  for (const [name, contents] of Object.entries(artifacts)) {
    const destination = path.join(cwd, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, contents);
  }
  return scenario.checks.every(rule => {
    if (rule.kind === 'file_exists') return fs.existsSync(path.join(cwd, rule.path));
    assert.equal(rule.kind, 'shell');
    assert.equal(rule.unsafe_shell, true);
    const result = spawnSync('bash', ['-c', rule.cmd], {
      cwd, encoding: 'utf8', timeout: 10000,
      env: { PATH: process.env.PATH, HOME: cwd },
    });
    assert.ifError(result.error);
    return result.status === 0 && (result.stdout + result.stderr).trim() === String(rule.expect_exact);
  });
}

test('skill and scenario metadata stays valid and concise', () => {
  for (const name of ['blog-post', 'post-draft', 'impeccable']) {
    const directory = path.join(root, 'agents/skills', name);
    const body = fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8');
    const frontmatter = YAML.parse(body.match(/^---\n([\s\S]*?)\n---/)[1]);
    assert.equal(frontmatter.name, name);
    assert.ok(frontmatter.description.trim().split(/\s+/).length <= 30);
    if (name === 'impeccable') continue;
    const cases = path.join(directory, 'evals/cases');
    for (const file of fs.readdirSync(cases)) {
      const scenario = load(name, path.basename(file, '.yaml'));
      assert.equal(scenario.schema_version, 2);
      assert.equal(scenario.id, path.basename(file, '.yaml'));
      assert.equal(scenario.skill_under_test, name);
      assert.ok(scenario.checks.length > 0);
      for (const fixture of Object.values(scenario.setup?.fixtures || {})) {
        assert.ok(fs.existsSync(path.join(scenario.directory, fixture)));
      }
    }
  }
  const ui = YAML.parse(fs.readFileSync(path.join(root, 'agents/skills/post-draft/agents/openai.yaml'), 'utf8'));
  assert.match(ui.interface.short_description, /evidence and author answers/);
});

test('workflow text allows direct work and keeps approval and fact safeguards', () => {
  const read = relative => fs.readFileSync(path.join(root, 'agents/skills', relative), 'utf8');
  const blog = read('blog-post/SKILL.md');
  assert.match(blog, /A complete-post review does not require an interview/);
  assert.match(blog, /When the author opts into collaborative interviews/);
  assert.match(blog, /Keep every fact, name, number, date, quote, citation, qualification, and conclusion/);
  assert.doesNotMatch(blog, /Interview before drafting unless|Run a Review Interview/);
  const draft = read('post-draft/SKILL.md');
  assert.match(draft, /Do not invent an interview\nhistory/);
  assert.match(draft, /state: partial/);
  assert.doesNotMatch(draft, /Prose is written after a round is answered, never before/);
  assert.match(read('impeccable/SKILL.md'), /not ordinary React implementation/);
  assert.match(read('impeccable/reference/craft.md'), /You must stop at every gate/);
  assert.match(read('impeccable/reference/shape.md'), /stop and wait for explicit confirmation/);
  assert.match(read('impeccable/reference/live.md'), /do not bypass the check or invent project decisions/);
});

test('direct complete review checker accepts findings and rejects interviews or edits', t => {
  const scenario = load('blog-post', 'direct-complete-review');
  const review = { findings: ['The post does not explain why the first duration matters.'], blocking_questions: [], draft_action: 'unchanged' };
  assert.equal(check(t, scenario, { 'review.md': JSON.stringify(review) }), true);
  assert.equal(check(t, scenario, { 'review.md': JSON.stringify({ ...review, blocking_questions: ['Who is the audience?'] }) }), false);
  assert.equal(check(t, scenario, { 'review.md': JSON.stringify(review), 'draft.md': 'Edited post.\n' }), false);
});

test('selected angle checker rejects invented results and accepts the supported part', t => {
  const scenario = load('blog-post', 'selected-angle-is-not-evidence');
  const draft = 'I changed the build configuration on Tuesday. I have not run the comparison yet.\n';
  const gaps = 'Partial draft. Missing evidence: comparison measurements.\n';
  assert.equal(check(t, scenario, { 'draft.md': draft, 'gaps.md': gaps }), true);
  assert.equal(check(t, scenario, { 'draft.md': draft + 'The migration halved build times.\n', 'gaps.md': gaps }), false);
  assert.equal(check(t, scenario, { 'draft.md': draft, 'gaps.md': gaps }), true);
});

test('source evidence fills a gap without an answered round or a false full-draft state', t => {
  const scenario = load('post-draft', 'source-resolved-gaps');
  const answered = load('post-draft', 'answered-round-keeps-unresolved-fact-partial');
  const filename = 'src/content/posts/cache-notebook.md';
  const original = fs.readFileSync(path.join(scenario.directory, 'fixtures/partial-cache.md'), 'utf8');
  const draft = original
    .replace('next: explain the author\'s cache choice', 'next: obtain bench-results.txt cold-start evidence')
    .replace('[Q: Why did I keep the cache?]', 'I kept the cache because offline preview lets me read pages on the train. This is a convenience choice, not a measured speed result.');
  const progress = { evidence_source: 'source-notes.md', answered_interview_rounds: 0, status: 'partial', cold_start_claims: [] };
  const artifacts = { [filename]: draft, 'progress.md': JSON.stringify(progress) };
  assert.equal(check(t, scenario, artifacts), true);
  assert.equal(check(t, answered, artifacts), true);
  assert.equal(check(t, scenario, { ...artifacts, [filename]: original }), false);
  assert.equal(check(t, scenario, { ...artifacts, [filename]: draft.replace('state: partial', 'state: full-draft') }), false);
  assert.equal(check(t, scenario, { ...artifacts, 'progress.md': JSON.stringify({ ...progress, answered_interview_rounds: 1 }) }), false);
  const authorSource = 'My bench-results.txt was never captured.';
  const externalSource = 'An external report says its author measured a 12 ms cold start.';
  for (const [label, text, subject, status, milliseconds, source_quote, expected] of [
    ['external attribution', 'The external report says its author measured a 12 ms cold start.', 'external-report', 'measured', 12, externalSource, true],
    ['explicit denial', 'The reported 12 ms is not my cold-start result; mine remains unmeasured.', 'author', 'unavailable', null, authorSource, true],
    ['unknown own timing', 'My cold-start measurement is unavailable.', 'author', 'unavailable', null, authorSource, true],
    ['unsupported own 12 ms', 'I measured a 12 ms cold start.', 'author', 'measured', 12, externalSource, false],
    ['unsupported own 7 ms', 'My cold-start time was 7 ms.', 'author', 'measured', 7, authorSource, false],
    ['wrong external timing', 'The external report measured a 7 ms cold start.', 'external-report', 'measured', 7, externalSource, false],
    ['fabricated source quote', 'The external report measured a 12 ms cold start.', 'external-report', 'measured', 12, 'My cold-start result was 12 ms.', false],
  ]) {
    const claim = { text, subject, status, milliseconds, source_quote };
    const result = check(t, scenario, {
      ...artifacts,
      [filename]: draft.replace('I kept the cache', `${text} I kept the cache`),
      'progress.md': JSON.stringify({ ...progress, cold_start_claims: [claim] }),
    });
    assert.equal(result, expected, label);
  }
  assert.equal(check(t, scenario, {
    ...artifacts,
    'progress.md': JSON.stringify({ ...progress, cold_start_claims: [{
      text: 'This passage is absent.', subject: 'author', status: 'unavailable',
      milliseconds: null, source_quote: authorSource,
    }] }),
  }), false, 'claim evidence must point to written prose');
  assert.equal(check(t, scenario, { ...artifacts, [filename]: draft.replace('blue drawer', 'red drawer') }), false);
  assert.equal(check(t, scenario, artifacts), true);
});
