const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const source = process.argv[2] || path.join(root, 'node_modules/@nano-step/eval-harness')
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-patch-test-'))
const target = path.join(work, 'package with spaces')
const patches = ['eval-harness-0.4.2.patch', 'eval-harness-gaps.patch', 'eval-harness-workflows.patch'].map(name => path.join(root, 'patches', name))
function run(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    env: command === 'git' ? { ...process.env, GIT_CEILING_DIRECTORIES: work } : process.env,
  })
}
function digest() {
  const hash = crypto.createHash('sha256')
  for (const file of fs.readdirSync(target, { recursive: true }).sort()) {
    const full = path.join(target, file)
    if (fs.statSync(full).isFile()) hash.update(file).update(fs.readFileSync(full))
  }
  return hash.digest('hex')
}
function apply() {
  return run('bash', [path.join(root, 'patch-eval-harness'), target])
}
try {
  fs.cpSync(source, target, { recursive: true })
  for (const patch of [...patches].reverse()) {
    if (run('git', ['-C', target, 'apply', '--reverse', '--check', patch]).status === 0) {
      assert.equal(run('git', ['-C', target, 'apply', '--reverse', patch]).status, 0)
    }
  }
  assert.equal(run('git', ['init', '--quiet', work]).status, 0)
  const before = digest()
  let result = apply()
  assert.equal(result.status, 0, result.stderr)
  assert.notEqual(digest(), before)
  const patched = digest()
  result = apply()
  assert.equal(result.status, 0, result.stderr)
  assert.equal(digest(), patched, 'second application changed files')

  for (const patch of patches.slice(1).reverse()) {
    assert.equal(run('git', ['-C', target, 'apply', '--reverse', patch]).status, 0)
  }
  result = apply()
  assert.equal(result.status, 0, result.stderr)
  assert.equal(digest(), patched, 'primary-only recovery produced different files')

  assert.equal(run('git', ['-C', target, 'apply', '--reverse', patches[2]]).status, 0)
  result = apply()
  assert.equal(result.status, 0, result.stderr)
  assert.equal(digest(), patched, 'two-patch recovery produced different files')

  for (const patch of [...patches].reverse()) {
    assert.equal(run('git', ['-C', target, 'apply', '--reverse', patch]).status, 0)
  }
  const scorer = path.join(target, 'scripts/eval/lib/score.sh')
  const originalScorer = fs.readFileSync(scorer, 'utf8')
  assert.ok(originalScorer.includes('  local out\n'))
  fs.writeFileSync(scorer, originalScorer.replace('  local out\n', '  local out unexpected_drift\n'))
  const partialDrift = digest()
  assert.notEqual(apply().status, 0)
  assert.equal(digest(), partialDrift, 'secondary patch failure applied the primary patch')
  fs.writeFileSync(scorer, originalScorer)
  result = apply()
  assert.equal(result.status, 0, result.stderr)
  assert.equal(digest(), patched)

  const pkg = path.join(target, 'package.json')
  const original = fs.readFileSync(pkg, 'utf8')
  fs.writeFileSync(pkg, JSON.stringify({ ...JSON.parse(original), version: '0.4.3' }))
  const wrongVersion = digest()
  assert.notEqual(apply().status, 0)
  assert.equal(digest(), wrongVersion, 'version failure changed files')
  fs.writeFileSync(pkg, original)

  fs.writeFileSync(path.join(target, 'scripts/eval/lib/transcript.sh'), 'unexpected source drift\n')
  const drift = digest()
  assert.notEqual(apply().status, 0)
  assert.equal(digest(), drift, 'drift failure partially applied the patch')
  console.log('PASS: patch application inside a checkout, idempotence, version check, and drift rejection')
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}
