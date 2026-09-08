/*
 * Writer's catch-all Bash "ask" rule overrides global hard denies. Keep this
 * repair until OpenCode can inherit those denies after an agent's default.
 * Pinned Plannotator's user-managed workflow leaves Plan permissions unchanged.
 */

function rules(value) {
  if (typeof value === "string") return { "*": value }
  return value
}

function restoreAgentPermissionBoundaries(config) {
  const globalBash = rules(config.permission?.bash)
  const writer = config.agent?.writer
  if (!globalBash || !writer) return

  const writerBash = rules(writer.permission?.bash) ?? {}
  for (const [pattern, action] of Object.entries(globalBash)) {
    if (action !== "deny") continue
    delete writerBash[pattern]
    writerBash[pattern] = "deny"
  }

  writer.permission ??= {}
  writer.permission.bash = writerBash
}

export default async () => ({
  config: restoreAgentPermissionBoundaries,
})
