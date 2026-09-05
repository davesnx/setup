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
const patch = path.join(root, 'patches/eval-harness-0.4.2.patch')
function run(command, args) {
  return spawnSync(command, args, { encoding: 'utf8' })
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
  if (run('git', ['-C', target, 'apply', '--reverse', '--check', patch]).status === 0) {
    assert.equal(run('git', ['-C', target, 'apply', '--reverse', patch]).status, 0)
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
