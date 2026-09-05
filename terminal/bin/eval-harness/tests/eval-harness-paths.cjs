const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const source = path.resolve(__dirname, '..')
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-paths-'))
const repo = path.join(work, 'repo with spaces')
const root = path.join(repo, 'terminal/bin/eval-harness')
const runner = path.join(root, 'eval-harness')
const bin = path.join(work, 'bin')
const env = {
  PATH: `${bin}:${process.env.PATH}`,
  HOME: path.join(work, 'home'),
  XDG_CONFIG_HOME: path.join(work, 'empty config'),
}

try {
  fs.mkdirSync(path.join(root, 'node_modules/@nano-step/eval-harness/scripts/eval'), { recursive: true })
  fs.mkdirSync(bin)
  fs.copyFileSync(path.join(source, 'eval-harness'), runner)
  fs.cpSync(path.join(source, 'shims'), path.join(root, 'shims'), { recursive: true })
  fs.cpSync(path.join(source, 'node_modules/yaml'), path.join(root, 'node_modules/yaml'), { recursive: true })
  fs.writeFileSync(path.join(bin, 'opencode'), '#!/bin/sh\nprintf "local-opencode\\n"\n', { mode: 0o755 })
  fs.writeFileSync(path.join(root, 'node_modules/@nano-step/eval-harness/scripts/eval/run.sh'), `
set -euo pipefail
printf '%s\\n' "$OPENCODE_SKILLS_ROOT" "$OPENCODE_SKILLS_EXTRA_ROOT" "$EVAL_STATE_DIR" "$EVAL_HARNESS_REGISTRY"
printf '%s\\n' "$EVAL_SMOKE_MODEL" "$EVAL_FULL_MODEL" "$OPENCODE_REAL_BIN" "$(command -v opencode)" "$(command -v yq)" "$@"
[[ -z "\${NODE_PATH+x}" ]]
printf 'id: local-yaml\\n' | yq -r '.id'
opencode
`)
  fs.symlinkSync('../repo with spaces/terminal/bin/eval-harness/eval-harness', path.join(bin, 'relative'))
  fs.symlinkSync('relative', path.join(bin, 'eval-harness'))
  fs.symlinkSync(runner, path.join(bin, 'absolute'))

  function check(command, overrides = {}) {
    const result = spawnSync(command, ['run', '--skill=example'], {
      cwd: work,
      env: { ...env, ...overrides },
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    const state = overrides.EVAL_STATE_DIR || path.join(overrides.XDG_STATE_HOME || path.join(env.HOME, '.local/state'), 'opencode/eval-harness')
    assert.deepEqual(result.stdout.trimEnd().split('\n'), [
      overrides.OPENCODE_SKILLS_ROOT || path.join(repo, 'skills'),
      overrides.OPENCODE_SKILLS_EXTRA_ROOT ?? (overrides.OPENCODE_SKILLS_ROOT ? '' : path.join(repo, 'terminal/opencode/skills')),
      state,
      overrides.EVAL_HARNESS_REGISTRY || path.join(state, 'registry.yaml'),
      overrides.EVAL_SMOKE_MODEL || overrides.EVAL_MODEL || 'openai/gpt-5.6-sol',
      overrides.EVAL_FULL_MODEL || overrides.EVAL_MODEL || 'openai/gpt-5.6-sol',
      path.join(bin, 'opencode'),
      path.join(root, 'shims/opencode'),
      path.join(root, 'shims/yq'),
      'run', '--skill=example', 'local-yaml', 'local-opencode',
    ])
  }

  for (const command of [runner, './repo with spaces/terminal/bin/eval-harness/eval-harness', './bin/relative', './bin/eval-harness', './bin/absolute', 'eval-harness']) {
    check(command)
  }
  check(runner, { XDG_STATE_HOME: path.join(work, 'state'), EVAL_MODEL: 'test/model' })
  check(runner, { OPENCODE_SKILLS_ROOT: path.join(work, 'skills'), OPENCODE_SKILLS_EXTRA_ROOT: '', EVAL_STATE_DIR: path.join(work, 'saved'), EVAL_HARNESS_REGISTRY: path.join(work, 'registry'), EVAL_SMOKE_MODEL: 'test/smoke', EVAL_FULL_MODEL: 'test/full' })
  check(runner, { OPENCODE_SKILLS_ROOT: path.join(work, 'skills') })
  check(runner, { OPENCODE_SKILLS_EXTRA_ROOT: path.join(work, 'extra') })
  console.log('PASS: direct and linked runner paths, local dependencies, shims, skills, state, and model settings')
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}
