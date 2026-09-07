import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { createHash, randomBytes, randomInt } from "node:crypto"
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { join } from "node:path"
import test from "node:test"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"

const marker = "setup-auto-improve"
const reviewer = "setup-auto-improve-reviewer"
const fixtureText = "LIVE_READ_EVIDENCE_9af813"
const skillText = "LIVE_SKILL_EVIDENCE_618caf"
const proposal = "LIVE_REVIEW_PROPOSAL_81bf72: Add a read-only verification step. Apply it?"
const model = { providerID: "live", modelID: "selected" }

async function listen(server) {
  const start = randomInt(100)
  for (let i = 0; i < 100; i++) {
    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject)
        server.listen(25000 + (start + i) % 100, "0.0.0.0", () => {
          server.removeListener("error", reject)
          resolve()
        })
      })
      return server.address().port
    } catch (error) {
      if (error.code !== "EADDRINUSE") throw error
    }
  }
  throw new Error("No free port in 25000-25099")
}

function text(message) {
  if (typeof message.content === "string") return message.content
  return (message.content ?? []).map((part) => part.text ?? "").join("\n")
}

function answer(parts) {
  return parts.filter((part) => part.type === "text").map((part) => part.text).join("")
}

async function until(label, check, signal, timeout = 15000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    signal.throwIfAborted()
    const result = await check()
    if (result) return result
    await delay(50, undefined, { signal })
  }
  throw new Error(`Timed out: ${label}`)
}

test("installed OpenCode forks an isolated, read-only auto-improve review", {
  skip: process.env.OPENCODE_LIVE_TEST !== "1" && "opt in with OPENCODE_LIVE_TEST=1; requires OpenCode 1.18.27",
  timeout: 120000,
}, async (t) => {
  assert.ok((await stat("/tmp/opencode")).isDirectory())
  const root = await mkdtemp("/tmp/opencode/auto-improve-live-")
  const project = join(root, "project")
  const configDirectory = join(root, "config", "opencode")
  const skillDirectory = join(configDirectory, "skills", "auto-improve")
  const artifact = join(project, "FORBIDDEN_WRITE")
  const fixture = join(project, "evidence.txt")
  const blocked = join(project, "source-denied.txt")
  const globalBlocked = join(project, "global-denied.txt")
  const agentBlocked = join(project, "agent-denied.txt")
  const deniedFiles = [globalBlocked, blocked, agentBlocked]
  const password = randomBytes(24).toString("hex")
  const authorization = `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}`
  const modelKey = randomBytes(24).toString("hex")
  const events = []
  const requests = []
  const failures = []
  const logs = []
  const scenarios = new Map()
  const controller = new AbortController()
  const signal = AbortSignal.any([controller.signal, t.signal])
  let host
  let hostClosed
  let eventPump
  let passed = false
  const fake = createServer((req, res) => {
    void (async () => {
      assert.equal(req.headers.authorization, `Bearer ${modelKey}`, "fake model requires its own key")
      assert.equal(req.url, "/v1/chat/completions", "only the local model endpoint is allowed")
      let body = ""
      for await (const chunk of req) body += chunk
      const input = JSON.parse(body)
      requests.push(input)
      assert.doesNotMatch(JSON.stringify(input.messages), /(?:GLOBAL|SOURCE|AGENT)_DENIED_CONTENT/,
        "denied file content must never reach the model")
      const id = `chatcmpl-${requests.length}`
      const base = { id, object: "chat.completion.chunk", created: 1, model: input.model }
      const emit = (delta, finish_reason = null) => res.write(`data: ${JSON.stringify({
        ...base, choices: [{ index: 0, delta, finish_reason }],
      })}\n\n`)
      const done = () => res.end("data: [DONE]\n\n")
      const say = (content) => {
        if (!input.stream) {
          res.setHeader("content-type", "application/json")
          res.end(JSON.stringify({ ...base, object: "chat.completion", choices: [
            { index: 0, message: { role: "assistant", content }, finish_reason: "stop" },
          ], usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 } }))
          return
        }
        emit({ role: "assistant", content })
        emit({}, "stop")
        done()
      }
      if (input.stream) res.setHeader("content-type", "text/event-stream")
      if (input.model === "background") return say("Local test title")
      assert.equal(input.model, model.modelID, "the review must use the source's selected model")
      const users = input.messages.filter((message) => message.role === "user")
      const parent = users.map(text).join("\n").match(/LIVE_PARENT_(proposal|quiet)_\d/)
      assert.ok(parent, "request must belong to a test-owned session")
      const scenario = scenarios.get(parent[1])
      assert.ok(scenario)
      const latest = text(users.at(-1))
      if (/^LIVE_PARENT_(proposal|quiet)_\d$/.test(latest)) {
        scenario.parentRequests.push(input)
        return say(`ANSWER_${latest}`)
      }
      scenario.reviewRequests.push(input)
      assert.match(latest, /auto-improve/i, "review prompt must request auto-improve")
      assert.ok(input.stream, "review uses the real streaming model path")
      if (scenario.reviewRequests.length === 1) {
        scenario.entered = true
        res.flushHeaders()
        await scenario.gate.promise
        if (signal.aborted) return res.end()
      }
      if (scenario.name === "quiet") return say("NO_PROPOSALS")
      const tools = input.messages.filter((message) => message.role === "tool")
      const call = (name, args) => {
        emit({ role: "assistant", tool_calls: [{ index: 0, id: `call_${scenario.reviewRequests.length}`,
          type: "function", function: { name, arguments: JSON.stringify(args) } }] })
        emit({}, "tool_calls")
        done()
      }
      if (tools.length === 0) return call("write_probe", {})
      if (tools.length === 1) {
        assert.match(text(tools[0]), /not available|not found|invalid|unknown|denied/i,
          "a forced unavailable write call must be rejected, not executed")
        return call("read", { filePath: fixture })
      }
      if (tools.length === 2) {
        assert.ok(text(tools[1]).includes(fixtureText), "real read tool must return the fixture")
        return call("skill", { name: "auto-improve" })
      }
      assert.ok(text(tools[2]).includes(skillText), "real skill tool must load the isolated skill")
      for (const [index, result] of tools.slice(3).entries()) {
        assert.match(text(result), /rule which prevents you from using this specific tool call/,
          `read of ${deniedFiles[index]} must fail through the host permission check`)
      }
      if (tools.length < 6) return call("read", { filePath: deniedFiles[tools.length - 3] })
      assert.equal(tools.length, 6, "review must use exactly six tool calls before its final answer")
      say(proposal)
    })().catch((error) => {
      failures.push(error)
      if (!res.headersSent) res.writeHead(500)
      res.end("Local fake model assertion failed")
    })
  })

  t.after(async () => {
    controller.abort()
    for (const scenario of scenarios.values()) scenario.gate.resolve()
    if (host && host.exitCode === null && host.signalCode === null) {
      host.kill("SIGTERM")
      await Promise.race([hostClosed, delay(2000, undefined, { ref: false })])
      if (host.exitCode === null && host.signalCode === null) {
        host.kill("SIGKILL")
        await hostClosed
      }
    }
    fake.closeAllConnections()
    if (fake.listening) await new Promise((resolve) => fake.close(resolve))
    await eventPump
    if (passed) await rm(root, { recursive: true, force: true })
    else {
      await writeFile(join(root, "failure.json"), JSON.stringify({
        failures: failures.map((error) => error.stack), events, requests,
        logs: logs.join("").replaceAll(password, "[redacted]").replaceAll(modelKey, "[redacted]"),
      }, null, 2))
      t.diagnostic(`Isolated failure evidence retained at ${root}/failure.json`)
    }
  })

  await Promise.all([project, skillDirectory, join(configDirectory, "tools"), join(root, "scratch"), join(root, "home")]
    .map((path) => mkdir(path, { recursive: true })))
  const sharedSkill = await readFile(new URL("../../../agents/skills/auto-improve/SKILL.md", import.meta.url), "utf8")
  await Promise.all([
    writeFile(fixture, fixtureText),
    writeFile(blocked, "SOURCE_DENIED_CONTENT"),
    writeFile(globalBlocked, "GLOBAL_DENIED_CONTENT"),
    writeFile(agentBlocked, "AGENT_DENIED_CONTENT"),
    writeFile(join(root, "models.json"), "{}"),
    writeFile(join(skillDirectory, "SKILL.md"), `${sharedSkill}\n${skillText}\n`),
    writeFile(join(configDirectory, "tools", "write_probe.js"), `import { writeFile } from "node:fs/promises"\nexport default { description: "Local write permission probe", args: {}, async execute() { await writeFile(${JSON.stringify(artifact)}, "UNSAFE"); return "WRITE_EXECUTED" } }\n`),
  ])
  const modelPort = await listen(fake)
  const env = {
    PATH: process.env.PATH,
    HOME: join(root, "home"),
    XDG_CONFIG_HOME: join(root, "config"),
    XDG_DATA_HOME: join(root, "data"),
    XDG_STATE_HOME: join(root, "state"),
    XDG_CACHE_HOME: join(root, "cache"),
    XDG_RUNTIME_DIR: join(root, "runtime"),
    TMPDIR: join(root, "scratch"),
    OPENCODE_TEST_HOME: join(root, "home"),
    OPENCODE_TEST_MANAGED_CONFIG_DIR: join(root, "managed"),
    OPENCODE_CONFIG_DIR: configDirectory,
    OPENCODE_DISABLE_DEFAULT_PLUGINS: "true",
    OPENCODE_DISABLE_EXTERNAL_SKILLS: "true",
    OPENCODE_DISABLE_CLAUDE_CODE: "true",
    OPENCODE_DISABLE_PROJECT_CONFIG: "true",
    OPENCODE_DISABLE_MODELS_FETCH: "true",
    OPENCODE_MODELS_PATH: join(root, "models.json"),
    OPENCODE_DISABLE_AUTOUPDATE: "true",
    OPENCODE_DISABLE_LSP_DOWNLOAD: "true",
    OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: "true",
    OPENCODE_SERVER_USERNAME: "opencode",
    OPENCODE_SERVER_PASSWORD: password,
    // The plugin and provider use the host's bundled SDKs. Any optional install
    // must fail locally rather than read user npm credentials or reach npm.
    npm_config_offline: "true",
    npm_config_registry: `http://127.0.0.1:${modelPort}/npm`,
    npm_config_userconfig: join(root, "npmrc"),
    npm_config_globalconfig: join(root, "global-npmrc"),
    npm_config_cache: join(root, "npm-cache"),
    npm_config_fetch_retries: "0",
    OPENCODE_CONFIG_CONTENT: JSON.stringify({
      plugin: [fileURLToPath(new URL("../auto-improve.mjs", import.meta.url))],
      enabled_providers: ["live"],
      provider: { live: {
        npm: "@ai-sdk/openai-compatible", name: "Local integration fixture", env: [],
        options: { baseURL: `http://127.0.0.1:${modelPort}/v1`, apiKey: modelKey },
        models: Object.fromEntries(["selected", "fallback", "background"].map((id) => [id, {
          name: id, tool_call: true, limit: { context: 100000, output: 4096 }, cost: { input: 0, output: 0 },
        }])),
      } },
      model: "live/fallback", small_model: "live/background", default_agent: "build",
      share: "disabled", snapshot: false, autoupdate: false, mcp: {},
      lsp: false, formatter: false, compaction: { auto: false, prune: false },
      // Native read matches paths relative to the host worktree, which need not
      // be this non-Git project directory. These patterns match either form.
      permission: { read: { "*": "allow", "*global-denied.txt": "deny" } },
      agent: { build: { permission: { read: { "*agent-denied.txt": "deny" } } } },
    }),
  }
  const binary = process.env.OPENCODE_LIVE_BINARY || "opencode"
  const version = spawnSync(binary, ["--version"], { env, cwd: project, encoding: "utf8", timeout: 10000 })
  assert.equal(version.error, undefined, "OPENCODE_LIVE_TEST=1 requires an installed OpenCode binary")
  assert.equal(version.status, 0, version.stderr)
  assert.equal(version.stdout.trim(), "1.18.27", "this live contract is pinned to OpenCode 1.18.27")

  const reservation = createServer()
  const hostPort = await listen(reservation)
  await new Promise((resolve) => reservation.close(resolve))
  host = spawn(binary, ["serve", "--hostname", "0.0.0.0", "--port", String(hostPort), "--print-logs"], {
    env, cwd: project, stdio: ["ignore", "pipe", "pipe"],
  })
  hostClosed = new Promise((resolve) => host.once("close", resolve))
  host.on("error", (error) => failures.push(error))
  host.stdout.on("data", (chunk) => logs.push(String(chunk)))
  host.stderr.on("data", (chunk) => logs.push(String(chunk)))
  const base = `http://127.0.0.1:${hostPort}`
  const headers = { authorization, "content-type": "application/json", "x-opencode-directory": project }
  async function api(path, method = "GET", body) {
    if (failures.length) throw failures[0]
    const response = await fetch(base + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    })
    assert.ok(response.ok, `${method} ${path}: ${response.status} ${response.ok ? "" : await response.text()}`)
    return response.status === 204 ? undefined : response.json()
  }
  await until("host health", async () => {
    assert.equal(host.exitCode, null, logs.join(""))
    try {
      const response = await fetch(base + "/global/health", { headers, signal: AbortSignal.timeout(500) })
      return response.ok && (await response.json()).healthy
    } catch (error) {
      if (error.name === "TimeoutError" || error.cause?.code === "ECONNREFUSED") return false
      throw error
    }
  }, signal, 30000)
  assert.equal((await fetch(base + "/session", { signal })).status, 401, "server must reject unauthenticated access")
  const stream = await fetch(base + "/event", { headers, signal })
  assert.ok(stream.ok)
  eventPump = (async () => {
    let buffer = ""
    for await (const chunk of stream.body.pipeThrough(new TextDecoderStream())) {
      buffer += chunk.replaceAll("\r\n", "\n")
      let end
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        const data = frame.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n")
        if (data) events.push(JSON.parse(data))
      }
    }
  })().catch((error) => { if (!signal.aborted) failures.push(error) })
  await until("event subscription", () => events.some((event) => event.type === "server.connected"), signal)
  const agents = await api("/agent")
  const reviewAgent = agents.find((agent) => agent.name === reviewer)
  assert.ok(reviewAgent, "plugin config hook must register the review agent")
  assert.equal(reviewAgent.hidden, true)
  assert.equal(reviewAgent.mode, "primary", "Task must not advertise the review agent")
  assert.ok(reviewAgent.permission.some((rule) => rule.permission === "*" && rule.pattern === "*" && rule.action === "deny"))
  assert.deepEqual((await api("/provider")).all.map((provider) => provider.id), ["live"])

  for (const name of ["proposal", "quiet"]) {
    const scenario = { name, entered: false, gate: Promise.withResolvers(), parentRequests: [], reviewRequests: [] }
    scenarios.set(name, scenario)
    const permission = [{ permission: "read", pattern: name === "quiet" ? "*" : "*source-denied.txt", action: "deny" }]
    const source = await api("/session", "POST", { title: `Live ${name} source`, permission })
    const eventStart = events.length
    async function prompt(number) {
      const before = events.length
      const result = await api(`/session/${source.id}/message`, "POST", {
        model, agent: "build", parts: [{ type: "text", text: `LIVE_PARENT_${name}_${number}` }],
      })
      assert.equal(result.info.error, undefined)
      assert.equal(result.info.finish, "stop")
      assert.equal(answer(result.parts), `ANSWER_LIVE_PARENT_${name}_${number}`)
      await until("source idle", () => events.slice(before).some((event) =>
        event.type === "session.idle" && event.properties.sessionID === source.id), signal)
      return result
    }
    for (let number = 1; number <= 2; number++) {
      await prompt(number)
      // Idle hooks read host state asynchronously after the prompt HTTP response.
      await delay(200, undefined, { signal })
      assert.equal((await api("/session")).filter((session) => session.title === `Auto-improve: ${source.title}`).length, 0)
    }
    await prompt(3)
    const sourceThree = await api(`/session/${source.id}/message`)
    const review = await until("review fork after three completed replies", async () =>
      (await api("/session")).find((session) => session.title === `Auto-improve: ${source.title}`), signal)
    assert.equal(review.parentID, undefined, "review must be an independent fork, not a blocking child task")
    await until("review model request held at gate", () => scenario.entered, signal)
    const reviewHistory = await api(`/session/${review.id}/message`)
    const reviewPrompt = reviewHistory.find((message) => message.parts.some((part) => part.metadata?.[marker]))
    assert.ok(reviewPrompt, "fork must contain a marked review prompt")
    assert.equal(reviewPrompt.info.agent, reviewer)
    assert.deepEqual(reviewPrompt.info.model, model)
    assert.ok(reviewPrompt.parts.some((part) => part.synthetic && part.metadata?.[marker] === true))
    assert.ok(!sourceThree.some((message) => message.info.id === reviewPrompt.info.id), "review prompt ID must be unique")
    assert.deepEqual(reviewHistory.filter((message) => message.info.id !== reviewPrompt.info.id && message.info.role === "user")
      .map((message) => answer(message.parts)), sourceThree.filter((message) => message.info.role === "user").map((message) => answer(message.parts)))
    assert.deepEqual(reviewHistory.filter((message) => message.info.role === "assistant" && message.info.time.completed)
      .map((message) => answer(message.parts)), sourceThree.filter((message) => message.info.role === "assistant").map((message) => answer(message.parts)),
    "fork must include every completed answer, including the third")
    assert.equal(review.metadata?.[marker]?.sourceID, source.id, "fork metadata must identify its source")
    assert.equal(review.metadata?.[marker]?.promptID, reviewPrompt.info.id)
    assert.deepEqual(review.permission.at(-1), permission[0], "source denials must follow review allowances")
    assert.ok(review.permission.some((rule) => rule.permission === "read" && rule.pattern === "*global-denied.txt" && rule.action === "deny"),
      "global read denial must survive the review's read allowance")
    const available = scenario.reviewRequests[0].tools.map((tool) => tool.function.name)
    for (const tool of available) {
      assert.ok(["read", "glob", "grep", "list", "skill"].includes(tool), `review must not expose ${tool}`)
    }
    assert.ok(available.includes("skill"), "review must expose skill")
    assert.equal(available.includes("read"), name !== "quiet", "a source-wide read denial must remove the review read tool")
    assert.equal(events.slice(eventStart).filter((event) => event.type === "tui.toast.show").length, 0)

    await prompt(4)
    const sourceFour = await api(`/session/${source.id}/message`)
    assert.equal(sourceFour.length, 8, "four source prompts must have exactly four normal replies")
    assert.equal(scenario.reviewRequests.length, 1, "parent completed while review was still held")
    scenario.gate.resolve()
    const finished = await until("review final answer", async () => {
      const messages = await api(`/session/${review.id}/message`)
      const last = messages.at(-1)
      return last?.info.role === "assistant" && last.info.time.completed && last.info.finish === "stop" && messages
    }, signal)
    assert.equal(answer(finished.at(-1).parts), name === "quiet" ? "NO_PROPOSALS" : proposal)
    assert.equal(finished.at(-1).info.error, undefined)
    if (name === "proposal") {
      await until("review-ready toast", () => events.slice(eventStart).some((event) =>
        event.type === "tui.toast.show" && JSON.stringify(event.properties).includes(review.title)), signal)
      const tools = finished.flatMap((message) => message.parts).filter((part) => part.type === "tool")
      assert.equal(tools.length, 6)
      assert.ok(tools.some((part) => part.tool === "read" && part.state.status === "completed" && part.state.output.includes(fixtureText)))
      assert.ok(tools.some((part) => part.tool === "skill" && part.state.status === "completed" && part.state.output.includes(skillText)))
      for (const file of deniedFiles) {
        const attempts = tools.filter((part) => part.tool === "read" && part.state.input.filePath === file)
        assert.equal(attempts.length, 1, `review must actually attempt read of ${file}`)
        assert.equal(attempts[0].state.status, "error", `read of ${file} must be denied`)
        assert.match(attempts[0].state.error, /rule which prevents you from using this specific tool call/)
      }
      assert.ok(review.permission.some((rule) => rule.permission === "read" && rule.pattern === "*agent-denied.txt" && rule.action === "deny"),
        "source-agent read denial must be inherited by the review")
    }
    await delay(300, undefined, { signal })
    assert.deepEqual(await api(`/session/${source.id}/message`), sourceFour, "review must never mutate source messages")
    assert.deepEqual((await api(`/session/${source.id}`)).permission, permission, "source permissions must not change")
    assert.equal(scenario.parentRequests.length, 4)
    for (const request of scenario.parentRequests) {
      assert.doesNotMatch(JSON.stringify(request.messages), /setup-auto-improve|LIVE_(REVIEW_PROPOSAL|READ_EVIDENCE|SKILL_EVIDENCE)/)
      const task = request.tools.find((tool) => tool.function.name === "task")
      assert.ok(task, "normal parent must keep its Task tool")
      assert.ok(request.tools.some((tool) => tool.function.name === "write_probe"), "write probe must really be registered in the host")
      assert.ok(!JSON.stringify(task).includes(reviewer), "hidden primary review agent must not be advertised in Task")
    }
    const emitted = events.slice(eventStart)
    assert.equal(emitted.filter((event) => event.type === "tui.toast.show").length, name === "quiet" ? 0 : 1)
    assert.ok(!emitted.some((event) => ["permission.asked", "tui.session.select", "tui.prompt.append"].includes(event.type)),
      "review must not wait for permission, change the UI session, or append to the parent prompt")
    assert.equal((await api("/session")).filter((session) => session.title === review.title).length, 1)
    const claim = join(root, "state", "auto-improve", "opencode", createHash("sha256").update(source.id).digest("hex"))
    assert.equal(await readFile(claim, "utf8"), "", "persistent claim must not contain a transcript")
    assert.equal((await stat(claim)).mode & 0o777, 0o600)
    await assert.rejects(stat(artifact), { code: "ENOENT" })
    assert.equal(await readFile(fixture, "utf8"), fixtureText)
    assert.deepEqual((await readdir(project)).sort(), ["agent-denied.txt", "evidence.txt", "global-denied.txt", "source-denied.txt"])
  }
  assert.doesNotMatch(JSON.stringify({ requests, events }), /(?:GLOBAL|SOURCE|AGENT)_DENIED_CONTENT/,
    "denied file content must not appear in model requests or host events")
  assert.deepEqual(failures, [])
  passed = true
})
