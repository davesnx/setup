/*
 * Custom OpenCode startup plugin, not a built-in feature. Plannotator grants
 * Plan access to all Markdown files, and Writer's catch-all Bash "ask" rule
 * overrides global hard denies. This plugin runs after Plannotator to restore
 * those permission boundaries.
 *
 * This workaround adds maintenance. Prefer fixing the conflicting configuration
 * and removing the plugin. Deleting it alone would restore the broader access.
 */

function rules(value) {
  if (typeof value === "string") return { "*": value }
  return value
}

function restoreAgentPermissionBoundaries(config) {
  const planEdit = rules(config.agent?.plan?.permission?.edit)
  if (planEdit) delete planEdit["*.md"]

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
