const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const source = path.resolve(__dirname, '..')
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-install-'))
const repo = path.join(work, 'repo with spaces')
const root = path.join(repo, 'terminal/bin/eval-harness')
const home = path.join(work, 'home')
const config = path.join(work, 'custom config')
const bin = path.join(home, '.local/bin')
const command = path.join(bin, 'eval-harness')
const stubBin = path.join(work, 'stubs')
const record = path.join(work, 'bun.json')
const poisonRecord = path.join(work, 'poison')
const env = {
  ...process.env,
  HOME: home,
  XDG_CONFIG_HOME: config,
  XDG_STATE_HOME: path.join(work, 'state'),
  XDG_DATA_HOME: path.join(work, 'data'),
  SETUP_BACKUP_ROOT: path.join(work, 'backups'),
  PATH: stubBin,
  BUN_RECORD: record,
  BUN_EXIT: '0',
}

function install(overrides = {}) {
  return spawnSync('/bin/sh', [path.join(root, 'install.sh')], { env: { ...env, ...overrides }, encoding: 'utf8' })
}

try {
  fs.mkdirSync(root, { recursive: true })
  fs.mkdirSync(stubBin)
  fs.mkdirSync(home)
  for (const name of ['dirname', 'mkdir', 'ln', 'readlink']) {
    const resolved = spawnSync('/bin/sh', ['-c', `command -v ${name}`], { encoding: 'utf8' })
    assert.equal(resolved.status, 0)
    fs.symlinkSync(resolved.stdout.trim(), path.join(stubBin, name))
  }
  fs.symlinkSync(process.execPath, path.join(stubBin, 'node'))
  fs.copyFileSync(path.join(source, 'install.sh'), path.join(root, 'install.sh'))
  for (const name of ['eval-harness', 'patch-eval-harness']) {
    fs.writeFileSync(path.join(root, name), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
  }
  fs.writeFileSync(path.join(stubBin, 'bun'), `#!${process.execPath}
require('node:fs').writeFileSync(process.env.BUN_RECORD, JSON.stringify(process.argv.slice(2)))
process.exit(Number(process.env.BUN_EXIT))
`, { mode: 0o755 })

  for (const name of ['bun', 'node']) {
    fs.renameSync(path.join(stubBin, name), path.join(work, name))
    const result = install()
    assert.equal(result.status, 69)
    assert.equal(result.stderr.trim(), `${name} is required.`)
    assert.equal(fs.existsSync(bin), false)
    assert.equal(fs.existsSync(record), false)
    fs.renameSync(path.join(work, name), path.join(stubBin, name))
  }

  assert.equal(install({ BUN_EXIT: '1' }).status, 1)
  assert.equal(fs.existsSync(command), false)
  assert.equal(install().status, 0)
  assert.deepEqual(JSON.parse(fs.readFileSync(record, 'utf8')), ['install', '--cwd', root, '--frozen-lockfile', '--force', '--backend=copyfile'])
  assert.equal(fs.readlinkSync(command), path.join(root, 'eval-harness'))
  assert.equal(fs.existsSync(config), false, 'fresh install must not create OpenCode config')

  for (const name of ['npm', 'npx']) {
    fs.writeFileSync(path.join(stubBin, name), `#!${process.execPath}
require('node:fs').writeFileSync(${JSON.stringify(poisonRecord)}, 'unexpected command')
process.exit(99)
`, { mode: 0o755 })
  }
  fs.mkdirSync(path.join(config, 'opencode'), { recursive: true })
  for (const name of ['eval-harness', 'patch-eval-harness']) {
    fs.symlinkSync(path.join(repo, 'terminal/opencode', name), path.join(config, 'opencode', name))
  }
  assert.equal(install({ BUN_EXIT: '1' }).status, 1)
  assert.equal(fs.readlinkSync(command), path.join(root, 'eval-harness'))
  for (const name of ['eval-harness', 'patch-eval-harness']) {
    assert.equal(fs.readlinkSync(path.join(config, 'opencode', name)), path.join(repo, 'terminal/opencode', name))
  }
  assert.equal(install().status, 0)
  assert.equal(install().status, 0)
  for (const name of ['eval-harness', 'patch-eval-harness']) {
    assert.equal(fs.readlinkSync(path.join(config, 'opencode', name)), path.join(root, name))
  }

  const legacy = path.join(config, 'opencode/eval-harness')
  fs.unlinkSync(legacy)
  fs.writeFileSync(legacy, 'user file')
  assert.equal(install().status, 0)
  assert.equal(fs.readFileSync(legacy, 'utf8'), 'user file')
  fs.unlinkSync(legacy)
  fs.symlinkSync('user-target', legacy)
  assert.equal(install().status, 0)
  assert.equal(fs.readlinkSync(legacy), 'user-target')

  fs.unlinkSync(command)
  fs.writeFileSync(command, 'user command')
  fs.unlinkSync(record)
  assert.equal(install().status, 73)
  assert.equal(fs.readFileSync(command, 'utf8'), 'user command')
  assert.equal(fs.existsSync(record), false, 'link guard must stop before Bun')
  assert.equal(fs.existsSync(poisonRecord), false, 'installer must not call npm or npx')
  console.log('PASS: Bun/Node preflight, npm-free install, retry/repeat, link migration, and user-file protection')
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}
