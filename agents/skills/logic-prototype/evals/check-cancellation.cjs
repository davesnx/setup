const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { spawn } = require('node:child_process')

// CDP uses two inherited pipes, so this check opens no debugging network port.
async function checkCancellation(file) {
  assert.ok(fs.statSync(file).isFile(), `Artifact not found: ${file}`)
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-cancellation-'))
  const browser = spawn(process.env.EVAL_CHROMIUM_BIN || '/usr/bin/chromium', [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-pipe', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], detached: true })
  const pending = new Map()
  let sequence = 0
  let sessionId
  let buffer = ''
  let stderr = ''
  let failure
  const external = []
  function abort(message, code = 127) {
    failure = Object.assign(new Error(message), { exitCode: code })
    for (const request of pending.values()) request.reject(failure)
    pending.clear()
  }
  function send(method, params = {}) {
    if (failure) return Promise.reject(failure)
    const id = ++sequence
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      browser.stdio[3].write(`${JSON.stringify({ id, method, params, sessionId })}\0`)
    })
  }
  browser.stderr.on('data', data => { stderr = (stderr + data).slice(-4000) })
  browser.on('error', error => abort(`Chromium unavailable: ${error.message}`))
  browser.on('exit', code => abort(`Chromium exited ${code}: ${stderr}`))
  browser.stdio[3].on('error', error => abort(`Chromium pipe: ${error.message}`))
  browser.stdio[4].setEncoding('utf8')
  browser.stdio[4].on('data', data => {
    buffer += data
    let boundary
    while ((boundary = buffer.indexOf('\0')) !== -1) {
      const message = JSON.parse(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 1)
      if (message.method === 'Network.requestWillBeSent' && /^(https?|wss?):/.test(message.params.request.url)) {
        external.push(message.params.request.url)
      }
      const request = pending.get(message.id)
      if (!request) continue
      pending.delete(message.id)
      if (message.error) request.reject(Object.assign(new Error(message.error.message), { exitCode: 127 }))
      else request.resolve(message.result)
    }
  })
  const interrupted = () => abort('Browser check interrupted', 124)
  process.once('SIGTERM', interrupted)
  const deadline = setTimeout(() => abort('Browser check exceeded 20 seconds', 124), 20000)
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    assert.ok(!result.exceptionDetails, `Page script failed: ${JSON.stringify(result.exceptionDetails)}`)
    return result.result.value
  }
  async function state(expectedState, expectedRefund) {
    const actual = await evaluate(`(() => {
      const read = id => {
        const e = document.getElementById(id);
        if (!e || !e.checkVisibility({checkOpacity:true, checkVisibilityCSS:true}) || !e.getClientRects().length) return null;
        return e.innerText.trim();
      };
      return {state:read('order-state'), refund:read('refund-amount')};
    })()`)
    assert.equal(actual.state?.toLowerCase(), expectedState, 'Rendered order state')
    assert.notEqual(actual.refund, null, 'Refund must be visible')
    assert.match(actual.refund, /^\s*(?:[$\u20ac\u00a3]\s*)?\d+(?:\.\d{1,2})?\s*$/, 'Numeric refund value')
    assert.equal(Number(actual.refund.replace(/[^0-9.]/g, '')), expectedRefund, 'Rendered refund amount')
  }
  async function click(name, required = true) {
    const button = await evaluate(`(() => {
      const matches = [...document.querySelectorAll('button,[role="button"]')].filter(e => {
        const label = e.getAttribute('aria-label') || e.innerText;
        return label.trim().toLowerCase() === ${JSON.stringify(name.toLowerCase())};
      });
      if (matches.length !== 1) return null;
      const e = matches[0];
      e.scrollIntoView({block:'center', inline:'center'});
      const r = e.getBoundingClientRect();
      return {visible:e.checkVisibility({checkOpacity:true, checkVisibilityCSS:true}) && r.width > 0 && r.height > 0,
        disabled:e.matches(':disabled') || e.getAttribute('aria-disabled') === 'true',
        x:r.x + r.width / 2, y:r.y + r.height / 2};
    })()`)
    assert.ok(button?.visible, `One visible ${name} button is required`)
    if (button.disabled) {
      assert.equal(required, false, `${name} must be enabled`)
      return
    }
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: button.x, y: button.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: button.x, y: button.y, button: 'left', clickCount: 1 })
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
  }
  try {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    sessionId = (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId
    await send('Network.enable')
    await send('Network.setBlockedURLs', { urls: ['http://*', 'https://*', 'ws://*', 'wss://*'] })
    await send('Page.enable')
    await send('Page.navigate', { url: pathToFileURL(path.resolve(file)).href })
    await evaluate(`new Promise(resolve => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, {once:true});
    })`)
    await state('pending', 0)
    await click('Ship', false)
    await state('pending', 0)
    await click('Pay')
    await state('paid', 0)
    await click('Pay', false)
    await state('paid', 0)
    await click('Cancel')
    await state('cancelled', 100)
    for (const name of ['Pay', 'Ship', 'Cancel']) {
      await click(name, false)
      await state('cancelled', 100)
    }
    await click('Reset')
    await state('pending', 0)
    await click('Cancel')
    await state('cancelled', 0)
    for (const name of ['Pay', 'Ship', 'Cancel']) {
      await click(name, false)
      await state('cancelled', 0)
    }
    await click('Reset')
    await click('Pay')
    await click('Ship')
    await state('shipped', 0)
    for (const name of ['Cancel', 'Pay', 'Ship']) {
      await click(name, false)
      await state('shipped', 0)
    }
    await click('Reset')
    await state('pending', 0)
    await click('Reset')
    await state('pending', 0)
    assert.deepEqual(external, [], 'Prototype must not request external resources')
  } finally {
    clearTimeout(deadline)
    if (browser.pid) {
      try { process.kill(-browser.pid, 'SIGKILL') } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
      await new Promise(resolve => {
        if (browser.exitCode !== null || browser.signalCode !== null) resolve()
        else browser.once('exit', resolve)
      })
    }
    process.removeListener('SIGTERM', interrupted)
    fs.rmSync(profile, { recursive: true, force: true })
  }
}

if (require.main === module) {
  checkCancellation(process.argv[2] || 'prototype.html').then(() => {
    process.stdout.write('drivable')
  }).catch(error => {
    console.error(error.message)
    process.exitCode = error.exitCode || 1
  })
}

module.exports = { checkCancellation }
