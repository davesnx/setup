import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtemp, mkdir, readFile, readdir, readlink, rm, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"

import autoImprove from "../auto-improve.mjs"

const sessionID = "ses_0123456789abcdefghijklmnop"
const directory = "/example/project"
const model = { providerID: "example", modelID: "chosen-model" }
const reviewer = "setup-auto-improve-reviewer"
const marker = "setup-auto-improve"

function permissionAction(rules, name, value) {
  return rules.findLast((rule) => (rule.permission === "*" || rule.permission === name) &&
    new RegExp(`^${rule.pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`).test(value))?.action
}

function user(id, parts = [{ type: "text", text: "Keep the requested task unchanged" }]) {
  return {
    message: { id, sessionID, role: "user", time: { created: 1000 }, agent: "build", model },
    parts: parts.map((part, index) => ({ id: `prt_${id}_${index}`, sessionID, messageID: id, ...part })),
  }
}

function assistant(parentID, overrides = {}, text = "Task complete") {
  return {
    info: {
      id: `msg_answer_${parentID}`, sessionID, role: "assistant", parentID, agent: "build",
      time: { created: 1001, completed: 1002 }, ...model, mode: "build",
      path: { cwd: directory, root: directory }, cost: 0,
      tokens: { input: 5, output: 5, reasoning: 0, cache: { read: 0, write: 0 } },
      finish: "stop", ...overrides,
    },
    parts: [{ type: "text", text }],
  }
}

async function fixture(t, { fallbackHome = false, config = {} } = {}) {
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
    root, stateDirectory, config, sourceAgent: "build",
    claim: join(stateDirectory, createHash("sha256").update(sessionID).digest("hex")),
    session: { id: sessionID, projectID: "project", directory, title: "Test", version: "1.18.27", time: { created: 1000, updated: 1002 } },
    history: [], logs: [], reads: [], forks: [], updates: [], prompts: [], toasts: [],
    reviewSessions: new Map(), reviewHistory: new Map(),
  }
  const client = {
    session: {
      get: async (options) => {
        assert.equal(options.throwOnError, true)
        const id = options.path.id
        f.reads.push(["get", id])
        if (id === sessionID) {
          if (f.get) return f.get()
          return { data: structuredClone(f.session) }
        }
        if (f.reviewGet) return f.reviewGet(id)
        return { data: structuredClone(f.reviewSessions.get(id)) }
      },
      messages: async (options) => {
        assert.equal(options.throwOnError, true)
        assert.deepEqual(options.query, { limit: 100 })
        const id = options.path.id
        f.reads.push(["messages", id])
        if (id === sessionID) {
          if (f.messages) return f.messages()
          return { data: structuredClone(f.history) }
        }
        if (f.reviewMessages) return f.reviewMessages(id)
        return { data: structuredClone(f.reviewHistory.get(id)) }
      },
      fork: async (options) => {
        assert.deepEqual(options, { path: { id: sessionID }, body: {}, throwOnError: true })
        f.forks.push(options)
        if (f.fork) await f.fork()
        const id = `ses_review_${f.forks.length}`
        const session = { ...structuredClone(f.session), id, title: "Test (fork #1)" }
        delete session.parentID
        delete session.permission
        f.reviewSessions.set(id, session)
        // Native fork changes IDs and copies history, but emits no chat.message hook.
        const history = structuredClone(f.history)
        for (const entry of history) {
          entry.info.sessionID = id
          entry.info.id = `copied_${entry.info.id}`
          if (entry.info.parentID) entry.info.parentID = `copied_${entry.info.parentID}`
          await f.event("message.updated", { info: entry.info })
        }
        f.reviewHistory.set(id, history)
        return { data: structuredClone(session) }
      },
      update: async (options) => {
        assert.notEqual(options.path.id, sessionID)
        assert.equal(options.throwOnError, true)
        f.updates.push(structuredClone(options))
        if (f.update) return f.update(options)
        Object.assign(f.reviewSessions.get(options.path.id), structuredClone(options.body))
        return { data: structuredClone(f.reviewSessions.get(options.path.id)) }
      },
      promptAsync: async (options) => {
        assert.notEqual(options.path.id, sessionID)
        assert.equal(options.throwOnError, true)
        f.prompts.push(structuredClone(options))
        if (f.promptAsync) return f.promptAsync(options)
        const message = { ...options.body, id: options.body.messageID, sessionID: options.path.id, role: "user" }
        delete message.parts
        const output = { message, parts: structuredClone(options.body.parts) }
        await f.hooks["chat.message"]({ sessionID: options.path.id }, output)
        f.reviewHistory.get(options.path.id).push({ info: message, parts: output.parts })
        await f.event("message.updated", { info: message })
        return { response: { status: 204 } }
      },
    },
    app: { log: async (options) => { f.logs.push(options); return { data: true } } },
    tui: { showToast: async (options) => { f.toasts.push(options); return { data: true } } },
  }
  f.reload = async () => {
    const hooks = await autoImprove({ client, directory })
    await hooks.config(config)
    return hooks
  }
  f.hooks = await f.reload()
  f.event = (type, properties = { sessionID }) => f.hooks.event({ event: { type, properties } })
  f.input = async (id, parts) => {
    const output = user(id, parts)
    output.message.agent = f.sourceAgent
    const before = JSON.stringify(output)
    await f.hooks["chat.message"]({ sessionID }, output)
    assert.equal(JSON.stringify(output), before, "source input must stay byte-for-byte unchanged")
    f.history.push({ info: output.message, parts: output.parts })
    await f.event("message.updated", { info: output.message })
    return output
  }
  f.complete = async (id, parts, overrides) => {
    const output = await f.input(id, parts)
    const answer = assistant(id, overrides)
    f.history.push(answer)
    const before = JSON.stringify(f.history)
    await f.event("message.updated", { info: answer.info })
    await f.event("session.idle")
    assert.equal(JSON.stringify(f.history), before, "source history must stay byte-for-byte unchanged")
    return output
  }
  f.arm = async (prefix = "msg") => {
    for (let i = 1; i <= 3; i++) await f.complete(`${prefix}_${i}`)
  }
  f.finish = async (text = "1. Improve the test command.", overrides = {}) => {
    const prompt = f.prompts.at(-1)
    const id = prompt.path.id
    const answer = assistant(prompt.body.messageID, { sessionID: id, agent: reviewer, ...overrides }, text)
    f.reviewHistory.get(id).push(answer)
    await f.event("message.updated", { info: answer.info })
    await f.event("session.idle", { sessionID: id })
    return answer
  }
  return f
}

test("third successful reply launches only an independent review, without waiting for a model answer", async (t) => {
  const f = await fixture(t)
  await f.complete("msg_1")
  await f.event("session.idle")
  await f.event("session.idle")
  await f.complete("msg_2")
  assert.equal(f.forks.length, 0)
  await f.complete("msg_3")
  assert.equal(f.forks.length, 1)
  assert.equal(f.prompts.length, 1)
  assert.deepEqual(f.toasts, [])
  const prompt = f.prompts[0]
  assert.equal(prompt.path.id, "ses_review_1")
  assert.equal(prompt.body.agent, reviewer)
  assert.deepEqual(prompt.body.model, model)
  assert.match(prompt.body.messageID, /^msg_[a-zA-Z0-9]{26}$/)
  assert.match(prompt.body.parts[0].id, /^prt_[a-zA-Z0-9]{26}$/)
  assert.deepEqual(prompt.body.parts[0].metadata, { [marker]: true })
  assert.equal(prompt.body.parts[0].synthetic, true)
  assert.equal(prompt.body.parts[0].text, f.config.agent[reviewer].prompt)
  assert.equal(prompt.body.tools, undefined)
  const saved = f.reviewSessions.get(prompt.path.id)
  assert.equal(saved.parentID, undefined)
  assert.equal(saved.title, "Auto-improve: Test")
  assert.deepEqual(saved.metadata[marker], { sourceID: sessionID, promptID: prompt.body.messageID })
  assert.equal(await readFile(f.claim, "utf8"), "")
  assert.equal((await stat(f.claim)).mode & 0o777, 0o600)
  assert.equal((await stat(f.stateDirectory)).mode & 0o777, 0o700)
  assert.deepEqual(await readdir(f.stateDirectory), [createHash("sha256").update(sessionID).digest("hex")])
  await f.complete("msg_4")
  await f.finish()
  assert.deepEqual(f.toasts, [{ body: { title: "Auto-improve proposals", message: "Open /sessions -> Auto-improve: Test", variant: "info" }, throwOnError: true }])
  await f.event("session.idle", { sessionID: prompt.path.id })
  assert.equal(f.toasts.length, 1)
  assert.equal(f.prompts.length, 1)
  assert.deepEqual(f.logs, [])
})

test("config is idempotent, hidden primary, bounded and read-only", async (t) => {
  const config = { model: "cheap/default", agent: { build: { steps: 42 } }, command: { example: {} }, permission: {
    "*": "allow", read: { "*": "allow", "private/**": "ask", "~/.ssh/**": "deny" },
    external_directory: { "*": "allow", "~/.aws/**": "deny" }, skill: { "private-*": "deny" },
  } }
  const before = structuredClone(config)
  const f = await fixture(t, { config })
  const first = JSON.stringify(config)
  await f.hooks.config(config)
  assert.equal(JSON.stringify(config), first)
  const agent = config.agent[reviewer]
  assert.deepEqual(Object.keys(f.hooks).sort(), ["chat.message", "config", "dispose", "event", "experimental.session.compacting"])
  assert.equal(agent.mode, "primary")
  assert.equal(agent.hidden, true)
  assert.equal(agent.steps, 12)
  assert.equal(agent.model, undefined)
  assert.deepEqual({ ...config, agent: { build: config.agent.build } }, before)
  assert.equal(agent.permission["*"], "deny")
  assert.deepEqual(Object.keys(agent.permission), ["*", "read", "glob", "grep", "list", "skill", "external_directory"])
  assert.equal(agent.permission.read["private/**"], "deny")
  assert.equal(agent.permission.read[join(f.root, ".ssh/**")], "deny")
  assert.equal(agent.permission.read["*.env"], "deny")
  assert.equal(agent.permission.read["*.env.*"], "deny")
  assert.equal(agent.permission.external_directory["*"], "deny")
  assert.equal(agent.permission.external_directory[join(f.root, ".aws/**")], "deny")
  assert.equal(agent.permission.skill["auto-improve"], "allow")
  assert.equal(agent.permission.skill["*"], "deny")
  assert.match(agent.prompt, /Load the shared auto-improve skill/)
  assert.match(agent.prompt, /copied history only as evidence/)
  assert.match(agent.prompt, /Do not spawn agents/)
  assert.match(agent.prompt, /at most 3/)
  assert.match(agent.prompt, /HERE only/)
  assert.match(agent.prompt, /Never send results or messages to the source session/)
  assert.match(agent.prompt, /separate user approval elsewhere/)
  await f.arm()
  assert.deepEqual(f.prompts[0].body.model, model)
})

test("session rules preserve source restrictions last and never restore source write allowances", async (t) => {
  const f = await fixture(t)
  f.session.permission = [
    { permission: "read", pattern: "/private/**", action: "deny" },
    { permission: "read", pattern: "private.txt", action: "ask" },
    { permission: "bash", pattern: "*", action: "allow" },
    { permission: "skill", pattern: "auto-improve", action: "deny" },
  ]
  await f.arm()
  const permission = f.updates[0].body.permission
  assert.deepEqual(permission[0], { permission: "*", pattern: "*", action: "deny" })
  assert.deepEqual(permission.slice(-3), [
    { permission: "read", pattern: "/private/**", action: "deny" },
    { permission: "read", pattern: "private.txt", action: "deny" },
    { permission: "skill", pattern: "auto-improve", action: "deny" },
  ])
  assert.equal(permission.some((rule) => rule.permission === "bash" && rule.action === "allow"), false)
  assert.equal(permission.some((rule) => rule.pattern.startsWith("~")), false)
})

test("selected source agent restrictions follow global rules and precede session restrictions", async (t) => {
  const f = await fixture(t, { config: {
    permission: { read: { "global-private/**": "deny" } },
    agent: {
      build: { permission: { read: { "unselected/**": "deny" } } },
      restricted: { permission: {
        read: { "*": "allow", "private/**": "deny", "ask-first/**": "ask" },
        skill: { "auto-improve": "deny" }, bash: "allow",
      } },
    },
  } })
  await f.complete("msg_1")
  await f.complete("msg_2")
  f.sourceAgent = "restricted"
  f.session.permission = [{ permission: "read", pattern: "session-private/**", action: "deny" }]
  await f.complete("msg_3")
  const permission = f.updates[0].body.permission
  assert.deepEqual(permission.slice(-4), [
    { permission: "read", pattern: "private/**", action: "deny" },
    { permission: "read", pattern: "ask-first/**", action: "deny" },
    { permission: "skill", pattern: "auto-improve", action: "deny" },
    { permission: "read", pattern: "session-private/**", action: "deny" },
  ])
  for (const path of ["private/key", "ask-first/key", "global-private/key", "session-private/key"]) {
    assert.equal(permissionAction(permission, "read", path), "deny")
  }
  assert.equal(permissionAction(permission, "skill", "auto-improve"), "deny")
  assert.equal(permissionAction(permission, "bash", "ls"), "deny")
  assert.equal(permissionAction(permission, "read", "unselected/file"), "allow")
  assert.equal(permission.filter((rule) => rule.pattern === "global-private/**").length, 1)
  assert.equal(f.prompts.length, 1)
})

test("source agent shorthand asks become denials without losing inherited global restrictions", async (t) => {
  const f = await fixture(t, { config: {
    permission: { read: { "global-private/**": "deny" } },
    agent: { build: { permission: "ask" } },
  } })
  await f.arm()
  const permission = f.updates[0].body.permission
  assert.deepEqual(permission.at(-1), { permission: "*", pattern: "*", action: "deny" })
  assert.equal(permissionAction(permission, "read", "global-private/file"), "deny")
  assert.equal(permissionAction(permission, "read", "public/file"), "deny")
  assert.equal(permissionAction(permission, "skill", "auto-improve"), "deny")
})

test("external projects can review canonical terminal hooks through direct and installed plugin paths", async (t) => {
  const terminal = fileURLToPath(new URL("../../", import.meta.url))
  const agents = fileURLToPath(new URL("../../../agents/", import.meta.url))
  const f = await fixture(t, { config: { permission: {
    external_directory: { [`${terminal}opencode/private/**`]: "deny" },
  } } })
  f.config.agent.build = { permission: { external_directory: { [`${terminal}claude/private/**`]: "ask" } } }
  f.session.permission = [{ permission: "external_directory", pattern: `${terminal}restricted/**`, action: "deny" }]
  await f.arm()
  const permission = f.updates[0].body.permission
  assert.equal(f.session.directory, "/example/project")
  for (const path of ["opencode/auto-improve.mjs", "opencode/tests/auto-improve.test.mjs", "claude/auto-improve.sh", "claude/tests/auto-improve.test.sh"]) {
    assert.equal(permissionAction(permission, "external_directory", terminal + path), "allow")
  }
  assert.equal(permissionAction(permission, "external_directory", `${agents}skills/auto-improve/SKILL.md`), "allow")
  for (const path of ["opencode/private/key", "claude/private/key", "restricted/key"]) {
    assert.equal(permissionAction(permission, "external_directory", terminal + path), "deny")
  }
  assert.equal(permissionAction(permission, "external_directory", fileURLToPath(new URL("../../../ssh/key", import.meta.url))), "deny")
  const installed = join(f.root, ".config/opencode/auto-improve.mjs")
  await mkdir(join(f.root, ".config/opencode"), { recursive: true })
  await symlink(fileURLToPath(new URL("../auto-improve.mjs", import.meta.url)), installed)
  assert.equal(permissionAction(permission, "external_directory", installed), "allow")
  const installedPermission = JSON.parse(execFileSync(process.execPath, ["--preserve-symlinks", "--input-type=module", "-e", `
    const { default: plugin } = await import(process.argv[1])
    const hooks = await plugin({ client: {}, directory: "/example/project" })
    const config = { permission: JSON.parse(process.argv[2]) }
    await hooks.config(config)
    console.log(JSON.stringify(config.agent["setup-auto-improve-reviewer"].permission))
  `, pathToFileURL(installed).href, JSON.stringify(f.config.permission)], { encoding: "utf8" }))
  assert.deepEqual(installedPermission, f.config.agent[reviewer].permission)
})

test("global deny or ask restrictions cannot be weakened by the reviewer allowlist", async (t) => {
  const f = await fixture(t, { config: { permission: "ask" } })
  const permission = f.config.agent[reviewer].permission
  for (const [name, patterns] of Object.entries(permission)) {
    if (name !== "*") assert.deepEqual(Object.entries(patterns).at(-1), ["*", "deny"])
  }
  f.config.permission = { "r?ad": { "private/**": "ask" }, "g*": "deny" }
  await f.hooks.config(f.config)
  assert.equal(f.config.agent[reviewer].permission.read["private/**"], "deny")
  assert.equal(f.config.agent[reviewer].permission.glob["*"], "deny")
  assert.equal(f.config.agent[reviewer].permission.grep["*"], "deny")
})

test("exact NO_PROPOSALS and empty output are silent; other completed output gets only a toast", async (t) => {
  const f = await fixture(t)
  for (const [text, toastCount] of [["NO_PROPOSALS", 0], [" \nNO_PROPOSALS\n", 0], ["", 0], ["Not NO_PROPOSALS: improve tests.", 1]]) {
    f.hooks = await f.reload()
    await f.arm(`msg_${f.forks.length}`)
    await f.finish(text)
    assert.equal(f.toasts.length, toastCount)
    await rm(f.claim)
  }
})

test("copied answers and unrelated prompt IDs cannot announce completion", async (t) => {
  const f = await fixture(t)
  await f.arm()
  const id = f.prompts[0].path.id
  const promptEntry = f.reviewHistory.get(id).pop()
  await f.event("session.idle", { sessionID: id })
  assert.deepEqual(f.toasts, [])
  f.reviewHistory.get(id).push(promptEntry)
  await f.event("message.updated", { info: { ...user("msg_copied").message, sessionID: id } })
  await f.event("message.updated", { info: assistant("msg_copied", { sessionID: id, error: { name: "UnknownError" } }).info })
  await f.finish("Historical result", { parentID: "msg_other" })
  await f.finish("Wrong agent", { agent: "build" })
  await f.finish("Wrong session", { sessionID: "ses_other" })
  assert.deepEqual(f.toasts, [])
  await f.finish("A real proposal")
  assert.equal(f.toasts.length, 1)
})

test("incomplete, failed, summarized and aborted review answers do not toast", async (t) => {
  const f = await fixture(t)
  const invalid = [
    { finish: "tool-calls" }, { finish: "length" }, { finish: undefined },
    { time: { created: 1001 } }, { summary: true },
    { error: { name: "MessageAbortedError" } }, { error: { name: "UnknownError" } },
  ]
  for (const [index, overrides] of invalid.entries()) {
    f.hooks = await f.reload()
    await f.arm(`msg_${index}`)
    await f.finish("Do not toast", overrides)
    assert.deepEqual(f.toasts, [])
    await rm(f.claim)
  }
  f.hooks = await f.reload()
  await f.arm("msg_error")
  await f.event("session.error", { sessionID: f.prompts.at(-1).path.id })
  await f.finish("Late answer")
  assert.deepEqual(f.toasts, [])
})

test("duplicate completion reads and a newer review input do not produce stale toasts", async (t) => {
  const f = await fixture(t)
  await f.arm()
  const id = f.prompts[0].path.id
  const pending = Promise.withResolvers()
  const entered = Promise.withResolvers()
  f.reviewMessages = () => { entered.resolve(); return pending.promise }
  const finish = f.finish()
  await entered.promise
  const history = structuredClone(f.reviewHistory.get(id))
  const reads = f.reads.length
  await f.event("session.idle", { sessionID: id })
  assert.equal(f.reads.length, reads)
  const output = user("msg_manual_review")
  output.message.sessionID = id
  await f.hooks["chat.message"]({ sessionID: id }, output)
  pending.resolve({ data: history })
  await finish
  assert.deepEqual(f.toasts, [])
})

test("review deletion, compaction and disposal cancel an in-flight completion toast", async (t) => {
  const f = await fixture(t)
  for (const action of ["session.deleted", "session.compacted", "compacting", "dispose"]) {
    f.hooks = await f.reload()
    await f.arm(`msg_${action}`)
    const id = f.prompts.at(-1).path.id
    const entered = Promise.withResolvers()
    const pending = Promise.withResolvers()
    f.reviewMessages = () => { entered.resolve(); return pending.promise }
    const completion = f.finish()
    await entered.promise
    const result = { data: structuredClone(f.reviewHistory.get(id)) }
    if (action === "dispose") await f.hooks.dispose()
    else if (action === "compacting") await f.hooks["experimental.session.compacting"]({ sessionID: id }, { context: [] })
    else await f.event(action, { sessionID: id })
    pending.resolve(result)
    await completion
    assert.deepEqual(f.toasts, [])
    delete f.reviewMessages
    await rm(f.claim)
  }
})

test("exclusive empty claim survives reload and competing plugin instances", async (t) => {
  const f = await fixture(t, { fallbackHome: true })
  const first = f.hooks
  const second = await f.reload()
  for (let i = 1; i <= 3; i++) {
    const output = user(`msg_${i}`)
    await first["chat.message"]({ sessionID }, output)
    await second["chat.message"]({ sessionID }, output)
    f.history.push({ info: output.message, parts: output.parts }, assistant(output.message.id))
    await Promise.all([first.event({ event: { type: "session.idle", properties: { sessionID } } }), second.event({ event: { type: "session.idle", properties: { sessionID } } })])
  }
  assert.equal(f.forks.length, 1)
  assert.equal(f.prompts.length, 1)
  await f.hooks.dispose()
  f.hooks = await f.reload()
  await f.arm("msg_reload")
  assert.equal(f.forks.length, 1)
  assert.equal(await readFile(f.claim, "utf8"), "")
})

test("an installed reminder claim suppresses a new review attempt", async (t) => {
  const f = await fixture(t)
  await mkdir(f.stateDirectory, { recursive: true })
  await writeFile(f.claim, "")
  await f.arm()
  assert.deepEqual(f.forks, [])
})

test("synthetic, goal, compaction, subtask, ignored and empty inputs do not count", async (t) => {
  const f = await fixture(t)
  const file = { type: "file", mime: "image/png", url: "file:///example/picture.png" }
  const excluded = [
    [{ type: "text", synthetic: true, text: "Continue" }],
    [{ type: "text", ignored: true, text: "Ignored" }],
    [{ type: "text", text: "  " }], [],
    [{ type: "compaction", auto: true }, file],
    [{ type: "subtask", prompt: "Investigate", description: "Research", agent: "explore" }, file],
    [{ type: "text", text: "Continue", metadata: { "opencode-goal-plugin": true } }, file],
  ]
  for (const [index, parts] of excluded.entries()) await f.complete(`msg_excluded_${index}`, parts)
  assert.deepEqual(f.reads, [])
  const expansion = { type: "text", synthetic: true, text: "Expanded file" }
  await f.complete("msg_1", [expansion, { type: "text", text: "Inspect it" }])
  await f.complete("msg_2", [expansion, file])
  await f.complete("msg_3", [file])
  assert.equal(f.prompts.length, 1)
})

test("review sessions and their forks are excluded by metadata, agent or copied part marker", async (t) => {
  const f = await fixture(t)
  f.session.metadata = { [marker]: { sourceID: "ses_original" } }
  await f.arm("msg_metadata")
  assert.equal(f.reads.some(([method]) => method === "messages"), false)
  delete f.session.metadata
  for (let i = 1; i <= 3; i++) {
    const output = user(`msg_agent_${i}`)
    output.message.agent = reviewer
    await f.hooks["chat.message"]({ sessionID }, output)
    f.history.push({ info: output.message, parts: output.parts }, assistant(output.message.id))
    await f.event("session.idle")
  }
  await f.arm("msg_agent_fork")
  f.history = []
  await f.complete("msg_marker", [{ type: "text", text: "Review", metadata: { [marker]: true } }])
  await f.arm("msg_marker_fork")
  assert.deepEqual(f.forks, [])
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
  await f.complete("msg_2")
  assert.deepEqual(f.forks, [])
  await f.complete("msg_3")
  assert.equal(f.forks.length, 1)
})

test("child sessions never count", async (t) => {
  const f = await fixture(t)
  f.session.parentID = "ses_parent"
  await f.arm()
  assert.equal(f.reads.some(([method]) => method === "messages"), false)
  assert.deepEqual(f.forks, [])
  delete f.session.parentID
  await f.arm("msg_main")
  assert.equal(f.forks.length, 1)
})

test("only a complete latest assistant stop for the tracked latest user counts", async (t) => {
  const f = await fixture(t)
  const invalid = [
    { finish: "tool-calls" }, { finish: "length" }, { finish: undefined },
    { time: { created: 1001 } }, { parentID: "msg_other" }, { summary: true },
    { error: { name: "MessageAbortedError" } }, { error: { name: "UnknownError" } },
  ]
  for (const [index, overrides] of invalid.entries()) await f.complete(`msg_bad_${index}`, undefined, overrides)
  await f.input("msg_missing")
  f.history = [assistant("msg_missing")]
  await f.event("session.idle")
  await f.input("msg_superseded")
  const synthetic = user("msg_synthetic", [{ type: "text", text: "Continue", synthetic: true }])
  f.history.push({ info: synthetic.message, parts: synthetic.parts }, assistant("msg_synthetic"))
  await f.event("session.idle")
  assert.deepEqual(f.forks, [])
  await f.arm()
  assert.equal(f.forks.length, 1)
})

test("newer source input during either SDK read invalidates idle checks; duplicate idle is guarded", async (t) => {
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
  await f.complete("msg_first")
  await f.complete("msg_second")
  assert.deepEqual(f.forks, [])
  await f.complete("msg_third")
  assert.equal(f.forks.length, 1)
})

test("error, compaction, deletion, replay and disposal invalidate pending source checks", async (t) => {
  const f = await fixture(t)
  for (const action of ["session.error", "session.compacted", "compacting", "session.deleted", "message.removed", "replay", "dispose", "server.instance.disposed"]) {
    f.hooks = await f.reload()
    await f.complete(`msg_first_${action}`)
    await f.complete(`msg_second_${action}`)
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
    else if (action === "replay") await f.event("message.updated", { info: user("msg_untracked_replay").message })
    else if (action === "server.instance.disposed") await f.event(action, { directory })
    else await f.event(action)
    pending.resolve(result)
    await idle
    delete f.messages
    await assert.rejects(stat(f.claim), { code: "ENOENT" })
  }
  assert.deepEqual(f.forks, [])
})

test("cancelled setup still marks and restricts its fork, but never launches or retries", async (t) => {
  const f = await fixture(t)
  for (const action of ["input", "session.error", "compacting", "session.deleted", "dispose", "server.instance.disposed"]) {
    f.hooks = await f.reload()
    await f.complete(`msg_first_${action}`)
    await f.complete(`msg_second_${action}`)
    const entered = Promise.withResolvers()
    const pending = Promise.withResolvers()
    f.fork = () => { entered.resolve(); return pending.promise }
    await f.input(`msg_third_${action}`)
    f.history.push(assistant(`msg_third_${action}`))
    const completion = f.event("session.idle")
    await entered.promise
    if (action === "input") await f.input("msg_new_source")
    else if (action === "compacting") await f.hooks["experimental.session.compacting"]({ sessionID }, { context: [] })
    else if (action === "dispose") await f.hooks.dispose()
    else if (action === "session.deleted") await f.event(action, { info: f.session })
    else if (action === "server.instance.disposed") await f.event(action, { directory })
    else await f.event(action)
    const before = JSON.stringify(f.history)
    pending.resolve()
    await completion
    assert.equal(JSON.stringify(f.history), before)
    delete f.fork
    const update = f.updates.at(-1)
    assert.equal(update.body.title, "Auto-improve: Test")
    assert.equal(update.body.metadata[marker].sourceID, sessionID)
    assert.equal(update.body.permission[0].action, "deny")
    assert.deepEqual(f.prompts, [])
    assert.equal(await readFile(f.claim, "utf8"), "")
    f.hooks = await f.reload()
    await f.arm(`msg_reload_${action}`)
    assert.equal(f.forks.length, f.updates.length)
    await rm(f.claim)
  }
})

test("unsupported or failed setup fails closed, logs no transcript, and does not retry", async (t) => {
  const f = await fixture(t)
  const failures = ["fork", "update", "readback", "metadata", "permission", "parent", "permission-override", "promptAsync", "model", "source-permission"]
  for (const failure of failures) {
    f.hooks = await f.reload()
    const fail = () => { throw new Error("Private transcript must not appear in logs") }
    if (failure === "fork" || failure === "update" || failure === "promptAsync") f[failure] = fail
    if (failure === "readback") f.reviewGet = fail
    if (["metadata", "permission", "parent", "permission-override"].includes(failure)) f.reviewGet = (id) => {
      const data = structuredClone(f.reviewSessions.get(id))
      if (failure === "parent") data.parentID = sessionID
      else if (failure === "permission-override") data.permission.push({ permission: "*", pattern: "*", action: "allow" })
      else delete data[failure]
      return { data }
    }
    if (failure === "source-permission") f.session.permission = { read: "allow" }
    if (failure === "model") f.messages = () => {
      const data = structuredClone(f.history)
      delete data.findLast(({ info }) => info.role === "user").info.model
      return { data }
    }
    const prompts = f.prompts.length
    const forks = f.forks.length
    await f.arm(`msg_${failure}`)
    assert.equal(f.prompts.length, prompts + (failure === "promptAsync" ? 1 : 0))
    const attempted = f.forks.length
    await f.arm(`msg_retry_${failure}`)
    assert.equal(f.forks.length, attempted)
    assert.ok(attempted <= forks + 1)
    assert.equal(await readFile(f.claim, "utf8"), "")
    for (const name of ["fork", "update", "reviewGet", "promptAsync", "messages"]) delete f[name]
    delete f.session.permission
    await rm(f.claim)
  }
  assert.equal(f.logs.length, failures.length)
  assert.ok(!JSON.stringify(f.logs).includes("Private transcript"))
  assert.deepEqual(f.toasts, [])
})

test("readback checks ordered permission values, not JSON property order", async (t) => {
  const f = await fixture(t)
  f.reviewGet = (id) => {
    const data = structuredClone(f.reviewSessions.get(id))
    data.permission = data.permission.map(({ action, pattern, permission }) => ({ action, pattern, permission }))
    return { data }
  }
  await f.arm()
  assert.equal(f.prompts.length, 1)
  assert.deepEqual(f.logs, [])
})

test("source input during permission readback stops launch without touching the source", async (t) => {
  const f = await fixture(t)
  await f.complete("msg_1")
  await f.complete("msg_2")
  await f.input("msg_3")
  f.history.push(assistant("msg_3"))
  const entered = Promise.withResolvers()
  const pending = Promise.withResolvers()
  f.reviewGet = () => { entered.resolve(); return pending.promise }
  const completion = f.event("session.idle")
  await entered.promise
  await f.input("msg_4")
  const before = JSON.stringify(f.history)
  pending.resolve({ data: structuredClone(f.reviewSessions.get("ses_review_1")) })
  await completion
  assert.equal(JSON.stringify(f.history), before)
  assert.equal(f.updates.length, 1)
  assert.deepEqual(f.prompts, [])
  assert.equal(await readFile(f.claim, "utf8"), "")
})

test("promptAsync session errors remain silent even when acceptance returns 204", async (t) => {
  const f = await fixture(t)
  f.promptAsync = async ({ path }) => {
    await f.event("session.error", { sessionID: path.id })
    return { response: { status: 204 } }
  }
  await f.arm()
  await f.finish("Late result")
  assert.deepEqual(f.toasts, [])
  assert.equal(f.prompts.length, 1)
})

test("claim write failure logs safely and does not create a review", async (t) => {
  const f = await fixture(t)
  await mkdir(join(f.root, "state"), { recursive: true })
  await writeFile(join(f.root, "state", "auto-improve"), "blocked")
  await f.arm()
  assert.deepEqual(f.forks, [])
  assert.equal(f.logs.length, 1)
  assert.equal(f.logs[0].body.extra.code, "ENOTDIR")
})

test("configuration enables the plugin", async () => {
  const config = await readFile(new URL("../opencode.jsonc", import.meta.url), "utf8")
  const plugins = config.match(/"plugin": \[([\s\S]*?)\n  \]/)[1]
  assert.match(plugins, /auto-improve\.mjs/)
})

test("installer links the plugin and remains idempotent", async () => {
  // Use the real installer without git or npm in PATH.
  const home = await mkdtemp(join(tmpdir(), "opencode-install-"))
  try {
    const bin = join(home, "bin")
    await mkdir(bin)
    for (const name of ["sh", "mkdir", "ln", "readlink", "mv", "rm", "dirname", "date"]) {
      await symlink(execFileSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" }).trim(), join(bin, name))
    }
    const env = { HOME: home, PATH: bin, XDG_CONFIG_HOME: join(home, ".config"), SETUP_BACKUP_ROOT: join(home, "backups") }
    const installer = fileURLToPath(new URL("../install.sh", import.meta.url))
    for (let run = 0; run < 2; run++) {
      const result = spawnSync("sh", [installer, "ssh"], { env, encoding: "utf8" })
      assert.equal(result.status, 0, result.stderr)
    }
    const plugin = fileURLToPath(new URL("../auto-improve.mjs", import.meta.url))
    assert.equal(await readlink(join(home, ".config/opencode/auto-improve.mjs")), plugin)
    assert.ok((await stat(plugin)).isFile())
    await assert.rejects(stat(join(home, "backups")), "a rerun must not back anything up")
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})
