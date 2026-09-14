#!/usr/bin/env node
const os = require('node:os');
const YAML = require('yaml');
const { assert, fs, path, file, text, json, run } = require('./check-lib.cjs');

const root = __dirname;
const manifest = json('index.json', root);
assert.deepEqual(Object.keys(manifest).sort(), ['schema_version', 'tasks']);
assert.equal(manifest.schema_version, 1);
assert.equal(manifest.tasks.length, 8);
assert.equal(manifest.tasks.filter(task => task.split === 'development').length, 6);
assert.equal(manifest.tasks.filter(task => task.split === 'heldout').length, 2);
assert.equal(new Set(manifest.tasks.map(task => task.id)).size, 8);
assert.deepEqual(fs.readdirSync(path.join(root, 'tasks')).sort(), manifest.tasks.map(task => task.id).sort());

function relative(name) {
  assert.equal(typeof name, 'string');
  assert(name.length > 0 && !path.isAbsolute(name), 'relative path required');
  assert(!name.includes('\\'), 'ambiguous path');
  assert(name.split('/').every(part => part && part !== '.' && part !== '..'), 'unsafe path component');
  assert(!['.git', '.opencode', '.skills'].includes(name.split('/')[0]), 'reserved destination');
  return name;
}

function copy(source, destination, target) {
  relative(destination);
  const parent = path.dirname(destination);
  if (parent !== '.') {
    let current = target;
    for (const part of parent.split('/')) {
      current = path.join(current, part);
      if (fs.existsSync(current)) assert(!fs.lstatSync(current).isSymbolicLink(), 'linked destination parent');
      else fs.mkdirSync(current);
    }
  }
  const output = path.join(target, destination);
  if (fs.existsSync(output) || fs.lstatSync(output, { throwIfNoEntry: false })) {
    assert(!fs.lstatSync(output).isSymbolicLink(), 'linked destination');
  }
  fs.copyFileSync(source, output);
}

function snapshot(directory, prefix = '') {
  const result = {};
  for (const entry of fs.readdirSync(path.join(directory, prefix)).sort()) {
    const name = path.join(prefix, entry);
    const target = path.join(directory, name);
    const stat = fs.lstatSync(target);
    if (name === '.git/index') {
      // Index stat-cache timestamps can change while its staged content stays equal.
      const index = run('git', ['ls-files', '--stage'], { cwd: directory });
      assert.equal(index.status, 0);
      result[name] = index.stdout;
    } else if (stat.isSymbolicLink()) result[name] = { link: fs.readlinkSync(target) };
    else if (stat.isDirectory()) Object.assign(result, snapshot(directory, name));
    else result[name] = fs.readFileSync(target).toString('base64');
  }
  return result;
}

let checksRun = 0;
let negatives = 0;
let twoTurnTasks = 0;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-integrity-'));
try {
  for (const name of Object.keys(snapshot(root))) {
    const content = text(name, root);
    assert(!/[^\x00-\x7F]/.test(content), `non-ASCII corpus file: ${name}`);
    assert(!/[\t ]+$/m.test(content), `trailing whitespace: ${name}`);
    if (name.endsWith('.json')) JSON.parse(content);
    if (name.endsWith('.cjs') || name.endsWith('.sh')) {
      const command = name.endsWith('.cjs') ? 'node' : 'bash';
      const flag = name.endsWith('.cjs') ? '--check' : '-n';
      const result = run(command, [flag, file(name, root)]);
      assert.equal(result.status, 0, `${name}: ${result.stderr}`);
    }
  }
  for (const invalid of ['/tmp/escape', '../escape', 'a/../../escape', 'a\\b', '.git/index', 'a//b', '']) {
    assert.throws(() => relative(invalid));
  }
  const safety = path.join(temp, 'safety');
  fs.mkdirSync(safety);
  fs.symlinkSync(path.join(root, 'index.json'), path.join(safety, 'linked'));
  fs.symlinkSync(root, path.join(safety, 'parent'));
  assert.throws(() => file('linked', safety));
  assert.throws(() => file('parent/index.json', safety));
  assert.throws(() => file('../index.json', safety));
  assert.throws(() => copy(path.join(root, 'index.json'), 'linked', safety));
  assert.throws(() => copy(path.join(root, 'index.json'), 'parent/index.json', safety));

  for (const task of manifest.tasks) {
    assert.deepEqual(Object.keys(task).sort(), ['description', 'id', 'skill', 'source', 'split']);
    assert.match(task.id, /^[a-z][a-z0-9-]+$/);
    assert(['development', 'heldout'].includes(task.split));
    const source = task.source.split('#');
    file(relative(source[0]), root);
    assert(text(source[0], root).includes(`## ${source[1]}\n`), 'missing provenance section');
    const taskRoot = path.join(root, 'tasks', task.id);
    const reference = path.join(root, 'references', task.id);
    const casePath = file(`cases/${task.id}.yaml`, taskRoot);
    const document = YAML.parseDocument(fs.readFileSync(casePath, 'utf8'), { uniqueKeys: true });
    assert.deepEqual(document.errors, []);
    const c = document.toJS();
    assert.equal(c.id, task.id);
    assert.equal(c.skill_under_test, task.skill);
    assert.deepEqual(c.skills_loaded, [task.skill]);
    assert.equal(c.schema_version, 2);
    assert.equal(c.mode, 'deterministic');
    if (['source-comparison', 'verification-note'].includes(task.id)) {
      const metadata = json('metadata.json', taskRoot);
      assert.equal(metadata.manual_review, true);
      assert(metadata.criteria.length > 0);
      assert(!Object.values(c.setup.fixtures).includes('metadata.json'));
    }
    assert.notEqual(Boolean(c.prompt), Boolean(c.turns), 'prompt and turns must be exclusive');
    if (c.turns) {
      assert(Array.isArray(c.turns) && c.turns.length >= 2);
      assert(c.turns.every(turn => typeof turn === 'string' && turn.trim()));
      twoTurnTasks++;
    }
    assert(c.checks.length > 0);
    assert.deepEqual(fs.readdirSync(path.join(taskRoot, 'cases')), [`${task.id}.yaml`]);
    for (const [destination, sourcePath] of Object.entries(c.setup.fixtures)) {
      relative(destination);
      relative(sourcePath);
      assert(sourcePath.startsWith('fixtures/'), 'hidden fixture source');
      file(sourcePath, taskRoot);
      assert(!destination.includes('check.cjs') && !destination.includes('bad.json'), 'grader leaked');
    }
    if (c.setup.script) file(relative(c.setup.script), taskRoot);
    const goodFiles = fs.readdirSync(reference).filter(name => !['bad.json', 'prepare.sh'].includes(name));
    assert(goodFiles.length > 0, 'missing reference artifacts');
    const bad = json('bad.json', reference);
    assert(bad.length > 0, 'missing negative variants');
    const mutations = [null, ...bad, ...goodFiles.map(name => ({ name: `missing-${name}`, remove: [name] }))];
    for (const [index, mutation] of mutations.entries()) {
      const work = path.join(temp, `${task.id}-${index}`);
      fs.mkdirSync(work);
      const home = path.join(temp, `${task.id}-${index}-home`);
      fs.mkdirSync(home);
      const env = {
        PATH: process.env.PATH, HOME: home, LANG: 'C', LC_ALL: 'C',
        GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
        EVAL_FIXTURE_DIR: path.join(taskRoot, 'fixtures'),
      };
      for (const [destination, sourcePath] of Object.entries(c.setup.fixtures)) {
        copy(file(sourcePath, taskRoot), destination, work);
      }
      const setup = () => {
        if (!c.setup.script) return;
        const result = run('bash', [file(c.setup.script, taskRoot)], { cwd: work, env });
        assert.equal(result.status, 0, `${task.id} setup: ${result.stderr}`);
      };
      setup();
      const prepared = snapshot(work);
      setup();
      assert.deepEqual(snapshot(work), prepared, `${task.id}: repeated setup changed inputs`);
      if (task.id === 'guarded-install' && index === 0) {
        fs.unlinkSync(path.join(work, '.git/workflow-ready'));
        setup();
        assert.deepEqual(snapshot(work), prepared, 'partial Git setup did not recover');
      }
      if (task.id === 'path-migration' && index === 0) {
        fs.unlinkSync(path.join(work, 'home/personal'));
        setup();
        assert.deepEqual(snapshot(work), prepared, 'partial link setup did not recover');
      }
      assert.equal(fs.existsSync(path.join(work, 'references')), false);
      for (const name of goodFiles) copy(file(name, reference), name, work);
      if (fs.existsSync(path.join(reference, 'prepare.sh'))) {
        const result = run('bash', [file('prepare.sh', reference)], { cwd: work, env });
        assert.equal(result.status, 0, result.stderr);
      }
      if (mutation) {
        for (const name of mutation.restore || []) {
          const sourcePath = c.setup.fixtures[name];
          assert(sourcePath, `no original fixture for ${name}`);
          copy(file(sourcePath, taskRoot), name, work);
        }
        for (const [name, content] of Object.entries(mutation.write || {})) {
          file(name, work);
          fs.writeFileSync(path.join(work, name), content);
        }
        for (const [name, [before, after]] of Object.entries(mutation.replace || {})) {
          const content = text(name, work);
          assert(content.includes(before), `${task.id}: stale negative variant ${mutation.name}`);
          fs.writeFileSync(path.join(work, name), content.replace(before, after));
        }
        for (const name of mutation.remove || []) fs.unlinkSync(file(name, work));
      }
      const results = c.checks.map(check => {
        assert.equal(check.kind, 'shell', 'test must implement every case check kind');
        assert.equal(check.unsafe_shell, true);
        assert.equal(check.expect_exact, 'ok');
        assert.equal(check.cmd, 'node "$EVAL_FIXTURE_DIR/../check.cjs"', 'unexpected check command');
        const result = run('bash', ['-c', check.cmd], { cwd: work, env, timeout: 15000 });
        checksRun++;
        return {
          passed: result.status === 0 && (result.stdout + result.stderr).replace(/\n/g, '') === check.expect_exact,
          diagnostic: `exit ${result.status}\n${result.stdout}${result.stderr}`,
        };
      });
      if (mutation) {
        assert(results.some(result => !result.passed), `${task.id}: accepted ${mutation.name}`);
        negatives++;
      } else {
        assert(results.every(result => result.passed), `${task.id}: reference failed\n${results.map(result => result.diagnostic).join('\n')}`);
      }
    }
    console.log(`PASS ${task.id} (${task.split}): reference, ${mutations.length - 1} negative outputs`);
  }
  assert(twoTurnTasks >= 3);
  console.log(`PASS corpus: 8 tasks, 6 development, 2 heldout, ${twoTurnTasks} multi-turn; ${checksRun} actual case checks, ${negatives} rejected outputs`);
  console.log('No model runs. Heldout results are checker integrity tests, not model scores.');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
