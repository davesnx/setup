import { createHash, randomBytes } from "node:crypto"
import { closeSync, mkdirSync, openSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const marker = "setup-auto-improve"
const reminder = `Finish the current requested task first, including urgent work. At the next safe completion, load the auto-improve skill for this automatic one-per-session checkpoint. Review only the current session and relevant setup in read-only mode. Offer at most 3 concrete, evidence-backed proposals for skills, hooks, scripts, or rules, and ask which to apply. Do not edit files, commit, or publish as part of this review. If there is no useful proposal, finish quietly. Do not review twice. This reminder does not change host permissions.`

function genuine(parts) {
  if (parts.some((part) =>
    part.type === "compaction" || part.type === "subtask" ||
    Object.hasOwn(part.metadata ?? {}, "opencode-goal-plugin") ||
    Object.hasOwn(part.metadata ?? {}, marker)
  )) return false
  return parts.some((part) => !part.synthetic && !part.ignored && (
    part.type === "file" || (part.type === "text" && part.text.trim().length > 0)
  ))
}

export default async ({ client, directory }) => {
  const stateDirectory = join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "auto-improve", "opencode")
  const sessions = new Map()
  const deleted = new Set()
  let disposed = false

  async function diagnose(operation, error) {
    const body = {
      service: "auto-improve",
      level: "warn",
      message: `Skipped automatic review: ${operation} failed`,
      extra: { code: typeof error?.code === "string" ? error.code : "unknown" },
    }
    try {
      await client.app.log({ body, throwOnError: true })
    } catch {
      console.error(body.message)
    }
  }

  function invalidate(sessionID) {
    const state = sessions.get(sessionID)
    if (!state) return
    state.generation++
    state.current = undefined
    state.due = false
  }

  async function dispose() {
    disposed = true
    sessions.clear()
    deleted.clear()
  }

  return {
    dispose,
    "chat.message": async ({ sessionID }, output) => {
      if (disposed || deleted.has(sessionID)) return
      let state = sessions.get(sessionID)
      if (!state) {
        state = { generation: 0, seen: new Set(), completed: new Set(), due: false, issued: false, flight: false }
        sessions.set(sessionID, state)
      }
      const generation = ++state.generation
      state.current = undefined
      const { message, parts } = output
      if (message.role !== "user" || message.sessionID !== sessionID || !message.id) return
      if (state.seen.has(message.id)) return
      state.seen.add(message.id)
      if (!genuine(parts)) return
      state.current = message.id
      if (!state.due || state.issued) return

      const current = () => !disposed && !deleted.has(sessionID) && state.generation === generation
      try {
        const { data: session } = await client.session.get({ path: { id: sessionID }, throwOnError: true })
        if (!current() || session?.id !== sessionID || session.parentID !== undefined || !genuine(parts)) return
        const part = {
          id: `prt_${BigInt.asUintN(48, BigInt(Date.now()) * 4096n).toString(16).padStart(12, "0")}${randomBytes(7).toString("hex")}`,
          sessionID,
          messageID: message.id,
          type: "text",
          synthetic: true,
          metadata: { [marker]: true },
          text: reminder,
        }
        // No await between the exclusive claim and attachment: a newer input must not consume this reminder.
        mkdirSync(stateDirectory, { recursive: true, mode: 0o700 })
        const path = join(stateDirectory, createHash("sha256").update(sessionID).digest("hex"))
        try {
          const fd = openSync(path, "wx", 0o600)
          state.issued = true
          closeSync(fd)
        } catch (error) {
          if (error.code !== "EEXIST") throw error
          state.issued = true
          state.due = false
          return
        }
        parts.push(part)
        state.due = false
      } catch (error) {
        await diagnose("reminder attachment", error)
      }
    },
    "experimental.session.compacting": async ({ sessionID }) => invalidate(sessionID),
    event: async ({ event }) => {
      if (disposed) return
      const { type, properties } = event
      if (type === "server.instance.disposed") {
        if (properties.directory === directory) await dispose()
        return
      }
      const sessionID = properties.sessionID ?? properties.info?.sessionID ?? properties.info?.id
      if (type === "session.deleted") {
        deleted.add(sessionID)
        invalidate(sessionID)
        sessions.delete(sessionID)
        return
      }
      const state = sessions.get(sessionID)
      if (!state) return
      if (type === "session.error" || type === "session.compacted" || type === "message.removed") {
        invalidate(sessionID)
        return
      }
      if (type === "message.updated") {
        const { info } = properties
        if ((info.role === "user" && info.id !== state.current) || info.error || info.summary === true) invalidate(sessionID)
        return
      }
      if (type !== "session.idle" || state.flight || state.issued || !state.current || state.completed.has(state.current)) return
      // Reserve before the first read; duplicate idle events must not start parallel checks.
      state.flight = true
      const generation = state.generation
      const current = () => !disposed && !deleted.has(sessionID) && state.generation === generation
      try {
        const { data: session } = await client.session.get({ path: { id: sessionID }, throwOnError: true })
        if (!current() || session?.id !== sessionID || session.parentID !== undefined) return
        const { data: messages } = await client.session.messages({ path: { id: sessionID }, query: { limit: 100 }, throwOnError: true })
        if (!current() || !Array.isArray(messages)) return
        const user = messages.findLast(({ info }) => info.role === "user")
        const assistant = messages.at(-1)?.info
        if (user?.info.id !== state.current || user.info.sessionID !== sessionID || !genuine(user.parts)) return
        if (assistant?.role !== "assistant" || assistant.sessionID !== sessionID || assistant.parentID !== state.current ||
          !assistant.time.completed || assistant.error || assistant.summary || assistant.finish !== "stop") return
        state.completed.add(state.current)
        state.due = state.completed.size >= 3
      } catch (error) {
        await diagnose("completion check", error)
      } finally {
        state.flight = false
      }
    },
  }
}
