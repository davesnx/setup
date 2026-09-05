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
const record = path.join(work, 'npm.json')
const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: config, PATH: `${stubBin}:${process.env.PATH}`, NPM_RECORD: record }

function install(overrides = {}) {
  return spawnSync('sh', [path.join(root, 'install.sh')], { env: { ...env, ...overrides }, encoding: 'utf8' })
}

try {
  fs.mkdirSync(root, { recursive: true })
  fs.mkdirSync(stubBin)
  fs.mkdirSync(home)
  fs.copyFileSync(path.join(source, 'install.sh'), path.join(root, 'install.sh'))
  for (const name of ['eval-harness', 'patch-eval-harness']) {
    fs.writeFileSync(path.join(root, name), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
  }
  fs.writeFileSync(path.join(stubBin, 'npm'), `#!/usr/bin/env node
require('node:fs').writeFileSync(process.env.NPM_RECORD, JSON.stringify(process.argv.slice(2)))
process.exit(Number(process.env.NPM_EXIT || 0))
`, { mode: 0o755 })

  assert.equal(install({ NPM_EXIT: '1' }).status, 1)
  assert.equal(fs.existsSync(command), false)
  assert.equal(install().status, 0)
  assert.deepEqual(JSON.parse(fs.readFileSync(record, 'utf8')), ['install', '--prefix', root, '--no-audit', '--no-fund'])
  assert.equal(fs.readlinkSync(command), path.join(root, 'eval-harness'))
  assert.equal(fs.existsSync(config), false, 'fresh install must not create OpenCode config')

  fs.mkdirSync(path.join(config, 'opencode'), { recursive: true })
  for (const name of ['eval-harness', 'patch-eval-harness']) {
    fs.symlinkSync(path.join(repo, 'terminal/opencode', name), path.join(config, 'opencode', name))
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
  assert.equal(install().status, 73)
  assert.equal(fs.readFileSync(command, 'utf8'), 'user command')
  console.log('PASS: fresh and repeat install, failed install, link migration, and user-file protection')
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}
