const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const checker = path.join(__dirname, 'check-cancellation.cjs')
const source = fs.readFileSync(path.join(__dirname, 'fixtures/cancellation-working.html'), 'utf8')
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-browser-'))
function check(name, html, expected, extra = {}) {
  const file = path.join(work, `${name}.html`)
  fs.writeFileSync(file, html)
  const result = spawnSync(process.execPath, [checker, file], {
    encoding: 'utf8', timeout: 30000, env: { ...process.env, ...extra },
  })
  assert.equal(result.status, expected, `${name}: ${result.error || ''}\n${result.stdout}\n${result.stderr}`)
  if (expected === 0) assert.equal(result.stdout, 'drivable')
  else assert.notEqual(result.stdout, 'drivable')
  console.log(`PASS: ${name}`)
}
try {
  check('working', source, 0)
  check('working-repeat', source, 0)
  check('accessible-name', source.replace('<button>Pay</button>', '<button aria-label="Pay"><span>Make payment</span></button>')
    .replace('transition(button.textContent)', "transition(button.getAttribute('aria-label') || button.textContent)"), 0)
  check('inert-button', source.replace('transition(button.textContent)', 'void 0'), 1)
  check('illegal-transition', source.replace("state === 'pending' || state === 'paid'", "state !== 'cancelled'"), 1)
  check('wrong-refund', source.replace("state === 'paid' ? 100 : 0", "state === 'paid' ? 50 : 0"), 1)
  check('wrong-state', source.replace("state = 'cancelled'", "state = 'pending'"), 1)
  check('hidden-state', source.replace('id="order-state"', 'id="order-state" style="display:none"'), 1)
  check('terminal-not-absorbing', source.replace("action === 'Pay' && state === 'pending'", "action === 'Pay'"), 1)
  check('refund-not-reset', source.replace("state = 'pending'; refund = 0", "state = 'pending'"), 1)
  check('external-resource', source.replace('<h1>', '<img src="https://example.invalid/tracker.png"><h1>'), 1)
  check('missing-browser', source, 127, { EVAL_CHROMIUM_BIN: path.join(work, 'absent-chromium') })
  const hung = path.join(work, 'hung.html')
  fs.writeFileSync(hung, source.replace("let state = 'pending'", "while (true) {}"))
  const timed = spawnSync('timeout', ['--kill-after=2', '1', process.execPath, checker, hung], {
    encoding: 'utf8', timeout: 5000, env: { ...process.env, TMPDIR: work },
  })
  assert.equal(timed.status, 124, `${timed.error || ''}\n${timed.stderr}`)
  assert.equal(fs.readdirSync(work).filter(name => name.startsWith('eval-cancellation-')).length, 0,
    'A shell timeout must clean up the browser profile')
  console.log('PASS: timeout cleans up browser')
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}
