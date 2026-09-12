const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const source = process.argv[2] || path.join(root, 'node_modules/@nano-step/eval-harness')
const directory = path.join(source, 'scripts/eval/tests')
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-upstream-'))
const failures = []
try {
  // Individual tests install their own stubs ahead of these fail-closed guards.
  for (const command of ['opencode', 'curl', 'wget', 'npx']) {
    fs.writeFileSync(path.join(work, command), '#!/bin/sh\necho "Unexpected external command: $0" >&2\nexit 99\n', { mode: 0o755 })
  }
  const env = {
    ...process.env, PATH: `${work}:${root}/shims:${process.env.PATH}`,
    ANTHROPIC_API_KEY: '', EVAL_LLM_JUDGE_LIVE: '0', EVAL_SKIP_AUTH_CHECK: '1',
    EVAL_WARN_ONLY: '0', EVAL_BYPASS: '0', EVAL_REPETITIONS: '1', EVAL_STABILITY_SAMPLES: '1',
    EVAL_RUNNER: 'host', EVAL_CHECK_TIMEOUT_SECONDS: '30',
  }
  for (const file of fs.readdirSync(directory).filter(name => name.endsWith('.sh')).sort()) {
    const result = spawnSync('bash', [path.join(directory, file)], {
      cwd: source, env, encoding: 'utf8', timeout: 120000,
    })
    console.log(`${result.status === 0 ? 'PASS' : 'FAIL'}: ${file} (exit ${result.status})`)
    if (result.status !== 0) {
      failures.push(file)
      console.error(`${result.error || ''}\n${result.stdout}\n${result.stderr}`)
    }
  }
  assert.deepEqual(failures, [], 'Upstream test failures')
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}
