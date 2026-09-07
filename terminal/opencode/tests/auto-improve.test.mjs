import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import autoImprove from "../auto-improve.mjs"

const sessionID = "ses_0123456789abcdefghijklmnop"
const directory = "/example/project"
const model = { providerID: "example", modelID: "example-model" }

function user(id, parts = [{ type: "text", text: "Keep the requested task unchanged" }]) {
  return {
    message: { id, sessionID, role: "user", time: { created: 1000 }, agent: "build", model },
    parts: parts.map((part, index) => ({ id: `prt_${id}_${index}`, sessionID, messageID: id, ...part })),
  }
}

function assistant(parentID, overrides = {}) {
  return {
    info: {
      id: `msg_answer_${parentID}`, sessionID, role: "assistant", parentID,
      time: { created: 1001, completed: 1002 }, ...model, mode: "build",
      path: { cwd: directory, root: directory }, cost: 0,
      tokens: { input: 5, output: 5, reasoning: 0, cache: { read: 0, write: 0 } },
      finish: "stop", ...overrides,
    },
    parts: [],
  }
}

async function fixture(t, { fallbackHome = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), "auto-improve-test-"))
  const previous = { HOME: process.env.HOME, XDG_STATE_HOME: process.env.XDG_STATE_HOME }
  process.env.HOME = root
  if (fallbackHome) delete process.env.XDG_STATE_HOME
  else process.env.XDG_STATE_HOME = join(root, "state")
  t.after(async () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    await rm(root, { recursive: true, force: true })
  })
  const stateDirectory = join(fallbackHome ? join(root, ".local", "state") : join(root, "state"), "auto-improve", "opencode")
  const f = {
    root, stateDirectory,
    claim: join(stateDirectory, createHash("sha256").update(sessionID).digest("hex")),
    session: { id: sessionID, projectID: "project", directory, title: "Test", version: "1.18.25", time: { created: 1000, updated: 1002 } },
    history: [], logs: [], reads: [],
  }
  const client = {
    session: {
      get: async (options) => {
        assert.deepEqual(options, { path: { id: sessionID }, throwOnError: true })
        f.reads.push("get")
        if (f.get) return f.get()
        return { data: structuredClone(f.session) }
      },
      messages: async (options) => {
        assert.deepEqual(options, { path: { id: sessionID }, query: { limit: 100 }, throwOnError: true })
        f.reads.push("messages")
        if (f.messages) return f.messages()
        return { data: structuredClone(f.history) }
      },
    },
    app: { log: async (options) => { f.logs.push(options); return { data: true } } },
  }
  f.reload = () => autoImprove({ client, directory })
  f.hooks = await f.reload()
  f.event = (type, properties = { sessionID }) => f.hooks.event({ event: { type, properties } })
  f.input = async (id, parts) => {
    const output = user(id, parts)
    await f.hooks["chat.message"]({ sessionID }, output)
    f.history.push({ info: output.message, parts: output.parts })
    await f.event("message.updated", { info: output.message })
    return output
  }
  f.complete = async (id, parts, overrides) => {
    const output = await f.input(id, parts)
    const answer = assistant(id, overrides)
    f.history.push(answer)
    await f.event("message.updated", { info: answer.info })
    await f.event("session.idle")
    return output
  }
  f.arm = async (prefix = "msg") => {
    for (let i = 1; i <= 3; i++) {
      assert.equal((await f.complete(`${prefix}_${i}`)).parts.length, 1)
    }
  }
  return f
}

test("three distinct completions only arm; the next genuine input gets one appended reminder", async (t) => {
  const f = await fixture(t)
  await f.complete("msg_1")
  await f.event("session.idle")
  await f.event("session.idle")
  await f.complete("msg_2")
  assert.equal((await f.complete("msg_3")).parts.length, 1)
  await assert.rejects(stat(f.stateDirectory), { code: "ENOENT" })
  const output = await f.input("msg_4")
  assert.deepEqual(output.message, user("msg_4").message)
  assert.deepEqual(output.parts[0], user("msg_4").parts[0])
  const part = output.parts[1]
  assert.equal(output.parts.length, 2)
  assert.match(part.id, /^prt_[a-zA-Z0-9]{26}$/)
  assert.equal(part.sessionID, sessionID)
  assert.equal(part.messageID, output.message.id)
  assert.equal(part.synthetic, true)
  assert.deepEqual(part.metadata, { "setup-auto-improve": true })
  assert.match(part.text, /Finish the current requested task first/)
  assert.match(part.text, /load the auto-improve skill/)
  assert.match(part.text, /at most 3 concrete, evidence-backed/)
  assert.match(part.text, /ask which to apply/)
  assert.match(part.text, /Do not edit files, commit, or publish/)
  assert.match(part.text, /finish quietly/)
  assert.match(part.text, /Do not review twice/)
  assert.equal(await readFile(f.claim, "utf8"), "")
  assert.equal((await stat(f.claim)).mode & 0o777, 0o600)
  assert.equal((await stat(f.stateDirectory)).mode & 0o777, 0o700)
  assert.deepEqual(await readdir(f.stateDirectory), [createHash("sha256").update(sessionID).digest("hex")])
  assert.equal((await f.complete("msg_5")).parts.length, 1)
  assert.equal((await f.input("msg_6")).parts.length, 1)
  assert.deepEqual(f.logs, [])
})

test("the exclusive claim survives reload, with HOME fallback", async (t) => {
  const f = await fixture(t, { fallbackHome: true })
  await f.arm()
  assert.equal((await f.input("msg_4")).parts.length, 2)
  await f.hooks.dispose()
  f.hooks = await f.reload()
  await f.arm("msg_reload")
  assert.equal((await f.input("msg_after_reload")).parts.length, 1)
  assert.equal(await readFile(f.claim, "utf8"), "")
  assert.deepEqual(f.logs, [])
})

test("two plugin instances cannot attach two reminders", async (t) => {
  const f = await fixture(t)
  await f.arm()
  const first = f.hooks
  f.hooks = await f.reload()
  await f.arm("msg_second")
  const a = user("msg_next_a")
  const b = user("msg_next_b")
  await Promise.all([first["chat.message"]({ sessionID }, a), f.hooks["chat.message"]({ sessionID }, b)])
  assert.equal(a.parts.length + b.parts.length, 3)
  assert.equal((await readdir(f.stateDirectory)).length, 1)
})

test("mixed synthetic expansion and real text or file inputs are genuine", async (t) => {
  const f = await fixture(t)
  const expansion = { type: "text", synthetic: true, text: "Expanded file" }
  const file = { type: "file", mime: "image/png", url: "file:///example/picture.png" }
  await f.complete("msg_1", [expansion, { type: "text", text: "Inspect it" }])
  await f.complete("msg_2", [expansion, file])
  await f.complete("msg_3", [file])
  const output = await f.input("msg_4", [expansion, file])
  assert.deepEqual(output.parts.slice(0, 2), user("msg_4", [expansion, file]).parts)
  assert.equal(output.parts.length, 3)
})

test("synthetic, goal, compaction, subtask, ignored and empty inputs neither count nor receive reminders", async (t) => {
  const f = await fixture(t)
  const file = { type: "file", mime: "image/png", url: "file:///example/picture.png" }
  const excluded = [
    [{ type: "text", synthetic: true, text: "Continue" }],
    [{ type: "text", ignored: true, text: "Ignored" }],
    [{ type: "text", text: "  " }], [],
    [{ type: "compaction", auto: true }, file],
    [{ type: "subtask", prompt: "Investigate", description: "Research", agent: "explore" }, file],
    [{ type: "text", text: "Continue", metadata: { "opencode-goal-plugin": true } }, file],
    [{ type: "text", text: "Review", metadata: { "setup-auto-improve": true } }, file],
  ]
  for (const [index, parts] of excluded.entries()) await f.complete(`msg_excluded_${index}`, parts)
  assert.deepEqual(f.reads, [])
  await f.arm()
  for (const [index, parts] of excluded.entries()) {
    assert.equal((await f.input(`msg_later_${index}`, parts)).parts.length, parts.length)
  }
  // Excluded input events invalidate a pending checkpoint; another normal completion can arm it again.
  await f.complete("msg_rearm")
  assert.equal((await f.input("msg_next")).parts.length, 2)
})

test("history-only and replayed source user IDs cannot advance the count", async (t) => {
  const f = await fixture(t)
  for (let i = 0; i < 4; i++) {
    const output = user(`msg_history_${i}`)
    f.history.push({ info: output.message, parts: output.parts }, assistant(output.message.id))
    await f.event("session.idle")
  }
  assert.deepEqual(f.reads, [])
  await f.complete("msg_1")
  await f.complete("msg_1")
  await f.complete("msg_1")
  assert.equal((await f.complete("msg_2")).parts.length, 1)
  assert.equal((await f.complete("msg_3")).parts.length, 1)
  assert.equal((await f.input("msg_4")).parts.length, 2)
})

test("child sessions do not count and parentage is rechecked before attachment", async (t) => {
  const f = await fixture(t)
  f.session.parentID = "ses_parent"
  await f.arm()
  assert.equal((await f.input("msg_child")).parts.length, 1)
  assert.ok(!f.reads.includes("messages"))
  delete f.session.parentID
  await f.arm("msg_main")
  f.session.parentID = "ses_parent"
  assert.equal((await f.input("msg_changed")).parts.length, 1)
  await assert.rejects(stat(f.claim), { code: "ENOENT" })
})

test("only a complete latest assistant stop for the tracked latest user counts", async (t) => {
  const f = await fixture(t)
  const invalid = [
    { finish: "tool-calls" }, { finish: "length" }, { finish: undefined },
    { time: { created: 1001 } }, { parentID: "msg_other" }, { summary: true },
    { error: { name: "MessageAbortedError", data: { message: "Aborted" } } },
    { error: { name: "UnknownError", data: { message: "Failure" } } },
  ]
  for (const [index, overrides] of invalid.entries()) await f.complete(`msg_bad_${index}`, undefined, overrides)
  await f.input("msg_missing")
  f.history = [assistant("msg_missing")]
  await f.event("session.idle")
  await f.input("msg_superseded")
  const synthetic = user("msg_synthetic", [{ type: "text", text: "Continue", synthetic: true }])
  f.history.push({ info: synthetic.message, parts: synthetic.parts }, assistant("msg_synthetic"))
  await f.event("session.idle")
  await f.arm()
  assert.equal((await f.input("msg_next")).parts.length, 2)
})

test("a newer user during either SDK read invalidates idle checks; duplicate idle is guarded", async (t) => {
  const f = await fixture(t)
  for (const method of ["get", "messages"]) {
    await f.input(`msg_old_${method}`)
    f.history.push(assistant(`msg_old_${method}`))
    const result = { data: structuredClone(method === "get" ? f.session : f.history) }
    const entered = Promise.withResolvers()
    const pending = Promise.withResolvers()
    f[method] = () => { entered.resolve(); return pending.promise }
    const idle = f.event("session.idle")
    await entered.promise
    const reads = f.reads.length
    await f.event("session.idle")
    assert.equal(f.reads.length, reads)
    await f.input(`msg_new_${method}`)
    pending.resolve(result)
    await idle
    delete f[method]
  }
  await f.arm()
  assert.equal((await f.input("msg_next")).parts.length, 2)
})

test("error, compaction, deletion, and disposal invalidate pending idle reads", async (t) => {
  const f = await fixture(t)
  for (const action of ["session.error", "session.compacted", "compacting", "session.deleted", "dispose", "server.instance.disposed"]) {
    f.hooks = await f.reload()
    await f.input(`msg_${action}`)
    f.history.push(assistant(`msg_${action}`))
    const result = { data: structuredClone(f.history) }
    const entered = Promise.withResolvers()
    const pending = Promise.withResolvers()
    f.messages = () => { entered.resolve(); return pending.promise }
    const idle = f.event("session.idle")
    await entered.promise
    if (action === "compacting") await f.hooks["experimental.session.compacting"]({ sessionID }, { context: [] })
    else if (action === "dispose") await f.hooks.dispose()
    else if (action === "session.deleted") await f.event(action, { info: f.session })
    else if (action === "server.instance.disposed") await f.event(action, { directory })
    else await f.event(action)
    pending.resolve(result)
    await idle
    delete f.messages
    await f.arm(`msg_after_${action}`)
    const output = await f.input(`msg_next_${action}`)
    const stopped = ["session.deleted", "dispose", "server.instance.disposed"].includes(action)
    assert.equal(output.parts.length, stopped ? 1 : 2)
    if (!stopped) await rm(f.claim)
  }
})

test("stale attachment reads do not claim or modify an older user input", async (t) => {
  const f = await fixture(t)
  await f.arm()
  const pending = Promise.withResolvers()
  f.get = () => pending.promise
  const old = user("msg_old")
  const oldInput = f.hooks["chat.message"]({ sessionID }, old)
  const next = user("msg_next")
  const nextInput = f.hooks["chat.message"]({ sessionID }, next)
  pending.resolve({ data: f.session })
  await Promise.all([oldInput, nextInput])
  assert.equal(old.parts.length, 1)
  assert.equal(next.parts.length, 2)
  assert.equal(await readFile(f.claim, "utf8"), "")
})

test("untracked replay events invalidate a pending completion read", async (t) => {
  const f = await fixture(t)
  await f.input("msg_old")
  f.history.push(assistant("msg_old"))
  const result = { data: structuredClone(f.history) }
  const entered = Promise.withResolvers()
  const pending = Promise.withResolvers()
  f.messages = () => { entered.resolve(); return pending.promise }
  const idle = f.event("session.idle")
  await entered.promise
  const replay = user("msg_replay")
  await f.event("message.updated", { info: replay.message })
  pending.resolve(result)
  await idle
  delete f.messages
  f.history.push({ info: replay.message, parts: replay.parts }, assistant("msg_replay"))
  await f.event("session.idle")
  await f.arm()
  assert.equal((await f.input("msg_next")).parts.length, 2)
})

test("error, compaction, deletion and disposal during attachment do not consume a claim", async (t) => {
  const f = await fixture(t)
  for (const action of ["session.error", "compacting", "session.deleted", "dispose"]) {
    f.hooks = await f.reload()
    await f.arm(`msg_arm_${action}`)
    const pending = Promise.withResolvers()
    f.get = () => pending.promise
    const output = user(`msg_next_${action}`)
    const input = f.hooks["chat.message"]({ sessionID }, output)
    if (action === "compacting") await f.hooks["experimental.session.compacting"]({ sessionID }, { context: [] })
    else if (action === "dispose") await f.hooks.dispose()
    else if (action === "session.deleted") await f.event(action, { info: f.session })
    else await f.event(action)
    pending.resolve({ data: f.session })
    await input
    delete f.get
    assert.equal(output.parts.length, 1)
    await assert.rejects(stat(f.claim), { code: "ENOENT" })
  }
})

test("SDK and claim failures log diagnostics and skip the reminder without changing input", async (t) => {
  const f = await fixture(t)
  f.get = () => { throw new Error("Do not log transcript text") }
  await f.complete("msg_failed")
  assert.equal(f.logs.length, 1)
  delete f.get
  await f.arm()
  await mkdir(join(f.root, "state"), { recursive: true })
  await writeFile(join(f.root, "state", "auto-improve"), "blocked")
  assert.equal((await f.input("msg_blocked")).parts.length, 1)
  assert.equal(f.logs.length, 2)
  assert.match(f.logs[1].body.message, /reminder attachment failed/)
  assert.equal(f.logs[1].body.extra.code, "ENOTDIR")
  assert.ok(!JSON.stringify(f.logs).includes("transcript"))
  await rm(join(f.root, "state", "auto-improve"))
  assert.equal((await f.input("msg_retry")).parts.length, 2)
})

test("installer links the plugin file and the configuration leaves it off", async () => {
  // OpenCode has no forked subagent, so the review would run inline. Off by default.
  const config = await readFile(new URL("../opencode.jsonc", import.meta.url), "utf8")
  const plugins = config.match(/"plugin": \[([\s\S]*?)\n  \]/)[1]
  assert.doesNotMatch(plugins, /auto-improve\.mjs/)
  const installer = await readFile(new URL("../install.sh", import.meta.url), "utf8")
  assert.match(installer, /for name in [^\n]* auto-improve\.mjs; do\n  link_path "\$ROOT\/\$name" "\$CONFIG_HOME\/\$name"/)
  assert.ok((await stat(new URL("../auto-improve.mjs", import.meta.url))).isFile())
})
