const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const root = path.resolve(__dirname, '../../../..');
const YAML = process.env.EVAL_YAML_PARSER === 'ruby' ? {
  parse(input) {
    const result = spawnSync('ruby', ['-rpsych', '-rjson', '-e', 'puts JSON.generate(Psych.safe_load(STDIN.read))'], {
      input, encoding: 'utf8', timeout: 10000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  },
} : require(path.join(root, 'terminal/bin/eval-harness/node_modules/yaml'));

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

test('writing scenario metadata and fixtures stay valid', () => {
  for (const name of ['create-drafted-blog-post', 'write-polish-blog-post', 'critique-blog-post', 'impeccable']) {
    const directory = path.join(root, 'agents/skills', name);
    const body = fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8');
    const frontmatter = YAML.parse(body.match(/^---\n([\s\S]*?)\n---/)[1]);
    assert.equal(frontmatter.name, name);
    assert.ok(frontmatter.description.trim());
    if (name === 'impeccable') {
      assert.ok(frontmatter.description.trim().split(/\s+/).length <= 30);
      continue;
    }
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
});

test('direct complete review checker accepts findings and rejects interviews or edits', t => {
  const scenario = load('critique-blog-post', 'direct-complete-review');
  const review = { findings: [{ source_quote: 'My first build took 40 seconds.', observation: 'The post does not explain why the first duration matters.' }], blocking_questions: [], draft_action: 'unchanged' };
  assert.equal(check(t, scenario, { 'review.md': JSON.stringify(review) }), true);
  assert.equal(check(t, scenario, { 'review.md': JSON.stringify({ ...review, blocking_questions: ['Who is the audience?'] }) }), false);
  assert.equal(check(t, scenario, { 'review.md': JSON.stringify(review), 'draft.md': 'Edited post.\n' }), false);
  for (const findings of [
    ['The recipe needs more salt.'],
    [{ observation: 'The recipe needs more salt.' }],
    [{ source_quote: 'The recipe needs salt.', observation: 'Explain the amount.' }],
    [{ source_quote: ' ', observation: 'Explain the duration.' }],
    [{ source_quote: 'My first build took 40 seconds.', observation: ' ' }],
    [{ ...review.findings[0], extra: true }],
    [null], [],
  ]) {
    assert.equal(check(t, scenario, { 'review.md': JSON.stringify({ ...review, findings }) }), false, JSON.stringify(findings));
  }
  for (const contents of ['null', '[]', '```json\n' + JSON.stringify(review) + '\n```', JSON.stringify(review) + '\n{}']) {
    assert.equal(check(t, scenario, { 'review.md': contents }), false);
  }
  assert.equal(check(t, scenario, { 'review.md': JSON.stringify({ ...review, draft_action: 'edited' }) }), false);
  assert.equal(check(t, scenario, { 'review.md': JSON.stringify({ ...review, findings: [{
    source_quote: 'My first build took 40 seconds.', observation: 'This proves the moon is made of cheese.',
  }] }) }), true, 'a real quote does not prove the observation is meaningful; manual review is required');
});

test('direct review rejects an irrelevant uncited finding', t => {
  assert.equal(check(t, load('critique-blog-post', 'direct-complete-review'), {
    'review.md': JSON.stringify({ findings: ['The recipe needs more salt.'], blocking_questions: [], draft_action: 'unchanged' }),
  }), false);
});

test('selected angle checker accepts bullet scaffold but rejects prose and invented results', t => {
  const scenario = load('create-drafted-blog-post', 'selected-angle-is-not-evidence');
  const draft = '## Story\n- I changed the build configuration on Tuesday.\n## Argument\n- I have not run the comparison yet.\n## Conclusion\n- Result depends on the comparison.\n';
  const gaps = 'Partial draft. Missing evidence: comparison measurements.\n';
  assert.equal(check(t, scenario, { 'scaffold.md': draft, 'gaps.md': gaps }), true);
  assert.equal(check(t, scenario, { 'scaffold.md': draft + '- The migration halved build times.\n', 'gaps.md': gaps }), false);
  assert.equal(check(t, scenario, { 'scaffold.md': draft.replace('- I changed', 'I changed'), 'gaps.md': gaps }), false);
  assert.equal(check(t, scenario, { 'scaffold.md': draft, 'gaps.md': gaps }), true);
});

test('collection rejects causal inference and unwanted draft edits', t => {
  const scenario = load('create-drafted-blog-post', 'collection-resumes-after-draft');
  const reply = { notes: [{ source: 'latest-user', quote: "Friday's build took 28 seconds." }], cache_effect: 'unknown', draft_action: 'unchanged' };
  assert.equal(check(t, scenario, { 'reply.md': JSON.stringify(reply) }), true);
  assert.equal(check(t, scenario, { 'reply.md': JSON.stringify({ ...reply, cache_effect: 'improved' }) }), false);
  assert.equal(check(t, scenario, { 'reply.md': JSON.stringify(reply), 'draft.md': 'Rewritten.\n' }), false);
});

test('polish writes sourced prose without claiming unavailable art or code', t => {
  const scenario = load('write-polish-blog-post', 'outline-to-supported-prose');
  const post = 'On Tuesday I changed the build configuration. I have not run the before/after comparison yet.';
  const quote = 'On Tuesday I changed the build configuration.';
  const evidence = [{ text: post, source_quotes: [quote] }];
  const good = { 'post.md': post, 'gaps.json': JSON.stringify({ art: 'missing', code: 'missing' }), 'evidence.json': JSON.stringify(evidence) };
  assert.equal(check(t, scenario, good), true);
  assert.equal(check(t, scenario, { ...good, 'post.md': post + ' The migration halved build times.' }), false);
  assert.equal(check(t, scenario, { ...good, 'post.md': post + '\n\nI measured 12 ms.' }), false);
  assert.equal(check(t, scenario, { ...good, 'post.md': '## Story\n\n' + post }), false, 'this case explicitly requests prose only');
  assert.equal(check(t, scenario, { ...good, 'post.md': post + '\n\nThe cache sings to satellites.' }), false, 'unrecorded prose must fail');
  assert.equal(check(t, scenario, { ...good, 'gaps.json': JSON.stringify({ art: 'complete', code: 'missing' }) }), false);
  assert.equal(check(t, scenario, { ...good, 'gaps.json': JSON.stringify({ art: 'missing', code: 'complete' }) }), false);
  assert.equal(check(t, scenario, { ...good, 'evidence.json': JSON.stringify([{ text: post, source_quotes: ['I measured a 12 ms speedup.'] }]) }), false);
  assert.equal(check(t, scenario, { ...good, 'outline.md': '# Replaced\n' }), false);
  assert.equal(check(t, scenario, good), true);
});

function draftExample(name) {
  const scenario = load('write-polish-blog-post', name);
  const filename = 'src/content/posts/cache-notebook.md';
  const original = fs.readFileSync(path.join(scenario.directory, 'fixtures/partial-cache.md'), 'utf8');
  const source = fs.readFileSync(path.join(scenario.directory, 'fixtures/source-notes.md'), 'utf8');
  const source_quotes = [
    'I kept the cache because offline preview lets me read pages on the train.',
    'This is a convenience choice, not a measured speed result.',
  ];
  const text = source_quotes.join(' ');
  assert.ok(source.replace(/\s+/g, ' ').includes(text));
  const draft = original.replace('# Why keep the cache?\n\n', `# Why keep the cache?\n\n${text}\n\n`);
  const progress = {
    evidence_source: 'source-notes.md',
    answered_interview_rounds: name === 'source-resolved-gaps' ? 0 : 1,
    added_passages: [{ text, source_quotes }], cold_start_claims: [],
  };
  const artifacts = { [filename]: draft, 'progress.md': JSON.stringify(progress) };
  const withProgress = changes => ({ ...artifacts, 'progress.md': JSON.stringify({ ...progress, ...changes }) });
  const addParagraph = paragraph => draft.replace('## What is still unknown?', `${paragraph}\n\n## What is still unknown?`);
  return { scenario, filename, original, source, text, draft, progress, artifacts, withProgress, addParagraph };
}

for (const name of ['source-resolved-gaps', 'answered-round-keeps-unresolved-fact-partial']) {
  test(`${name}: rejects omitted passage records even with empty cold_start_claims`, t => {
    const { scenario, filename, progress, artifacts, addParagraph } = draftExample(name);
    const { added_passages, ...missing } = progress;
    assert.equal(check(t, scenario, {
      ...artifacts, [filename]: addParagraph('My cold start was 12 ms.'), 'progress.md': JSON.stringify(missing),
    }), false);
  });

  test(`${name}: accepts sourced output and checks complete paragraph coverage`, t => {
    const { scenario, filename, original, source, text, draft, progress, artifacts, withProgress, addParagraph } = draftExample(name);
    assert.equal(check(t, scenario, artifacts), true);
    assert.equal(check(t, scenario, { ...artifacts, [filename]: original }), false);
    assert.equal(check(t, scenario, { ...artifacts, [filename]: draft.replace('What is the cold-start time with the cache?', 'My cold start was 12 ms.') }), false);
    assert.equal(check(t, scenario, withProgress({ answered_interview_rounds: 1 - progress.answered_interview_rounds })), false);
    assert.equal(check(t, scenario, { ...artifacts, [filename]: draft.replace('blue drawer', 'red drawer') }), false);
    assert.equal(check(t, scenario, { ...artifacts, [filename]: draft.replace('## What is still unknown?', '## Results') }), false);
    for (const paragraph of ['My cold start was 12 ms.', 'The cache sings lullabies to satellites.']) {
      assert.equal(check(t, scenario, { ...artifacts, [filename]: addParagraph(paragraph) }), false, 'every new paragraph needs a record');
    }
    const passage = progress.added_passages[0];
    for (const added_passages of [
      [], null, [null], [passage, passage],
      [{ ...passage, text: 'This paragraph was never written.' }],
      [{ ...passage, text: ' ' }],
      [{ ...passage, source_quotes: [] }],
      [{ ...passage, source_quotes: [' '] }],
      [{ ...passage, source_quotes: ['My cold start was 12 ms.'] }],
      [{ ...passage, source_quotes: ['offline preview lets me read pages'] }],
      [{ ...passage, source_quotes: 'I kept the cache because offline preview lets me read pages on the train.' }],
      [{ ...passage, extra: true }],
      [passage, { ...passage, text: 'The backup key is in the blue drawer. This note does not concern cache performance.' }],
      [passage, { ...passage, text: 'What is the cold-start time with the cache?' }],
    ]) {
      assert.equal(check(t, scenario, withProgress({ added_passages })), false, JSON.stringify(added_passages));
    }
    assert.equal(check(t, scenario, { ...artifacts, [filename]: draft.replace(text, text + ' My cold start was 12 ms.') }), false, 'same-paragraph additions must also be recorded');
    assert.equal(check(t, scenario, { ...artifacts, [filename]: addParagraph(text) }), false, 'duplicate prose cannot reuse one record');
    assert.equal(check(t, scenario, { ...withProgress({ added_passages: [passage, passage] }), [filename]: addParagraph(text) }), false, 'duplicate records are forbidden even for repeated prose');
    assert.equal(check(t, scenario, { ...artifacts, 'source-notes.md': source + '\nMy cold start was 12 ms.\n' }), false, 'source notes must remain byte-for-byte unchanged');
    assert.equal(check(t, scenario, { ...artifacts, 'source-notes.md': source.replace('12 ms', '7 ms') }), false);
    assert.equal(check(t, scenario, {
      ...withProgress({ added_passages: [{ ...passage, source_quotes: ['My cold start was 12 ms.'] }] }),
      'source-notes.md': source + '\nMy cold start was 12 ms.\n',
    }), false, 'a forged citation cannot be made valid by changing the source');
    assert.equal(check(t, scenario, {
      ...withProgress({ added_passages: [{ ...passage, text: `  ${text.replaceAll(' ', '\t')}  ` }] }),
      [filename]: draft.replace(text, text.replace('train. This', 'train.\nThis')).replaceAll('\n', '\r\n'),
    }), true, 'paragraph text uses whitespace normalization');
    assert.equal(check(t, scenario, {
      ...withProgress({ added_passages: passage.source_quotes.map(sentence => ({ text: sentence, source_quotes: [sentence] })).reverse() }),
      [filename]: draft.replace(text, passage.source_quotes.join('\n \t\n')),
    }), true, 'blank lines define paragraphs; record order does not matter');
    assert.equal(check(t, scenario, { ...artifacts, [filename]: draft.replace('# Why keep the cache?\n\n', '# Why keep the cache?\n') }), true);
    assert.equal(check(t, scenario, { ...artifacts, [filename]: draft.replace(text, `An optional follow-up?\n\n${text}`) }), false, 'unrecorded opening text must fail');
    const nonsense = 'The cache sings lullabies to satellites.';
    assert.equal(check(t, scenario, {
      ...withProgress({ added_passages: [passage, { text: nonsense, source_quotes: passage.source_quotes }] }),
      [filename]: addParagraph(nonsense),
    }), true, 'real quotes attached to nonsense still require manual interpretation review');
    assert.equal(check(t, scenario, artifacts), true, 'repeated checks accept the same output');
  });

  test(`${name}: retains cold-start evidence validation`, t => {
    const { scenario, filename, source, progress, artifacts, withProgress, addParagraph } = draftExample(name);
    const authorSource = 'My bench-results.txt was never captured.';
    const externalSource = 'An external report says its author measured a 12 ms cold start.';
    assert.ok(source.replace(/\s+/g, ' ').includes(authorSource));
    assert.ok(source.replace(/\s+/g, ' ').includes(externalSource));
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
      assert.equal(check(t, scenario, {
        ...withProgress({
          added_passages: [...progress.added_passages, { text, source_quotes: [externalSource, authorSource] }],
          cold_start_claims: [claim],
        }),
        [filename]: addParagraph(text),
      }), expected, label);
    }
    assert.equal(check(t, scenario, withProgress({ cold_start_claims: [{
      text: 'This passage is absent.', subject: 'author', status: 'unavailable',
      milliseconds: null, source_quote: authorSource,
    }] })), false, 'claim evidence must point to written prose');
    const text = 'My cold start was 12 ms.';
    assert.equal(check(t, scenario, {
      ...withProgress({ added_passages: [...progress.added_passages, { text, source_quotes: [externalSource] }] }),
      [filename]: addParagraph(text),
    }), true, 'complete paragraph coverage cannot prove attribution or completeness of cold_start_claims');
    assert.equal(check(t, scenario, artifacts), true);
  });
}

test('polish gap cases use the same progress contract except for interview count', () => {
  const source = load('write-polish-blog-post', 'source-resolved-gaps');
  const answered = load('write-polish-blog-post', 'answered-round-keeps-unresolved-fact-partial');
  assert.deepEqual(source.setup, answered.setup);
  assert.equal(source.prompt.split('Put a brief account')[1], answered.prompt.split('Put a brief account')[1]);
  assert.equal(source.checks[0].cmd.replace('answered_interview_rounds: 0', 'answered_interview_rounds: 1'), answered.checks[0].cmd);
});
