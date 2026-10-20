const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')

const launcher = path.join(__dirname, 'with-browser.sh')
const macFinder = path.resolve(__dirname, '../../../../mac/tests/find-chromium.sh')

function fixture(t) {
  const work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'eval-browser-')))
  t.after(() => fs.rmSync(work, { recursive: true, force: true }))
  const bin = path.join(work, 'bin')
  fs.mkdirSync(bin)
  fs.writeFileSync(path.join(bin, 'uname'), '#!/bin/sh\nprintf "Linux\\n"\n', { mode: 0o755 })
  function executable(name, mode = 0o755) {
    const file = path.join(work, name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, '#!/bin/sh\nexit 0\n', { mode })
    return file
  }
  function run(extra = {}, args = [process.execPath, '-p', 'process.env.EVAL_CHROMIUM_BIN']) {
    const env = { ...process.env, PATH: bin }
    delete env.EVAL_CHROMIUM_BIN
    return spawnSync('/bin/bash', [launcher, ...args], { cwd: work, encoding: 'utf8', env: { ...env, ...extra } })
  }
  return { work, bin, executable, run }
}

test('browser launcher honors explicit paths with spaces and command names', t => {
  const { executable, run } = fixture(t)
  executable('bin/chromium')
  const selected = executable('custom browser')
  const explicit = run({ EVAL_CHROMIUM_BIN: selected })
  assert.equal(explicit.status, 0, explicit.stderr)
  assert.equal(explicit.stdout.trim(), selected)
  const relative = run({ EVAL_CHROMIUM_BIN: './custom browser' }, [process.execPath, '-e', `
    process.chdir(require('node:os').tmpdir())
    require('node:fs').accessSync(process.env.EVAL_CHROMIUM_BIN, require('node:fs').constants.X_OK)
    console.log(require('node:path').resolve(process.env.EVAL_CHROMIUM_BIN))
  `])
  assert.equal(relative.status, 0, relative.stderr)
  assert.equal(relative.stdout.trim(), selected)
  const named = executable('bin/chosen-browser')
  const byName = run({ EVAL_CHROMIUM_BIN: 'chosen-browser' })
  assert.equal(byName.status, 0, byName.stderr)
  assert.equal(byName.stdout.trim(), named)
})

test('browser launcher discovers PATH browsers and preserves child failure', t => {
  const { executable, run } = fixture(t)
  const selected = executable('bin/chromium-browser')
  const result = run()
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), selected)
  const empty = run({ EVAL_CHROMIUM_BIN: '' })
  assert.equal(empty.status, 0, empty.stderr)
  assert.equal(empty.stdout.trim(), selected)
  assert.equal(run({}, [process.execPath, '-e', 'process.exit(42)']).status, 42)
})

test('missing or invalid browser configuration fails instead of falling back', t => {
  const { work, executable, run } = fixture(t)
  assert.equal(run().status, 127)
  executable('bin/chromium')
  const nonExecutable = executable('not executable', 0o644)
  for (const browser of [path.join(work, 'missing'), nonExecutable, work]) {
    const result = run({ EVAL_CHROMIUM_BIN: browser })
    assert.equal(result.status, 127, browser)
    assert.match(result.stderr, /EVAL_CHROMIUM_BIN/)
  }
  assert.equal(run({}, []).status, 64)
})

test('macOS discovery searches application roots and skips non-executables', t => {
  const { work, executable } = fixture(t)
  const system = path.join(work, 'system apps')
  const user = path.join(work, 'user apps')
  executable('system apps/Chromium.app/Contents/MacOS/Chromium', 0o644)
  const selected = executable('user apps/Brave Browser.app/Contents/MacOS/Brave Browser')
  const result = spawnSync('/bin/bash', [macFinder, system, user], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), selected)
  fs.unlinkSync(selected)
  assert.equal(spawnSync('/bin/bash', [macFinder, system, user]).status, 1)
})
