import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { parse as parseJSONC } from "jsonc-parser"
import { parse as parseYAML } from "yaml"

import permissionPlugin from "../../agent-permission-boundaries.mjs"

const root = new URL("../../", import.meta.url)
const upstreamRoot = new URL(
  "node_modules/@plannotator/opencode/",
  import.meta.url,
)
const upstreamPackage = JSON.parse(
  await readFile(new URL("package.json", upstreamRoot), "utf8"),
)
// OpenCode 1 loads main. Node's package exports would load the OpenCode 2 adapter.
const { default: plannotator } = await import(
  new URL(upstreamPackage.main, upstreamRoot)
)

test("pinned user-managed hook preserves Plan; local repair keeps Writer hard denies on reruns", async () => {
  const errors = []
  const config = parseJSONC(
    await readFile(new URL("opencode.jsonc", root), "utf8"),
    errors,
    {
      allowTrailingComma: true,
    },
  )
  assert.deepEqual(errors, [])
  const manifest = JSON.parse(
    await readFile(new URL("package.json", import.meta.url), "utf8"),
  )
  const version = manifest.dependencies["@plannotator/opencode"]
  assert.match(version, /^\d+\.\d+\.\d+$/)
  assert.equal(upstreamPackage.version, version)
  const pluginIndex = config.plugin.findIndex(
    (entry) =>
      Array.isArray(entry) && entry[0].startsWith("@plannotator/opencode@"),
  )
  assert.ok(pluginIndex >= 0)
  const [specifier, options] = config.plugin[pluginIndex]
  assert.equal(specifier, `@plannotator/opencode@${version}`)
  assert.deepEqual(options, { workflow: "user-managed" })
  assert.equal(
    config.plugin[pluginIndex + 1],
    "./agent-permission-boundaries.mjs",
  )

  for (const name of ["plan", "writer"]) {
    const markdown = await readFile(new URL(`agents/${name}.md`, root), "utf8")
    const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
    assert.ok(frontmatter, `${name} frontmatter must exist`)
    config.agent[name] = parseYAML(frontmatter[1])
  }
  // Only these two hooks run. No application, provider, MCP, tool, or session starts.
  config.provider = {}
  config.enabled_providers = []
  config.mcp = {}
  const globalPermissions = structuredClone(config.permission)
  const writerPermissions = structuredClone(config.agent.writer.permission)
  assert.equal(writerPermissions.bash, "ask")
  const expectedPlan = {
    submit_plan: "allow",
    edit: {
      "*": "deny",
      "plans/*_PLAN.md": "allow",
      "*/plans/*_PLAN.md": "allow",
      ".opencode/plans/*.md": "allow",
      "*/.opencode/plans/*.md": "allow",
      "~/.local/share/opencode/plans/*.md": "allow",
      "docs/tasks/*/plan.md": "allow",
      "*/docs/tasks/*/plan.md": "allow",
    },
  }
  const expectedBash = [
    ["*", "ask"],
    ...Object.entries(globalPermissions.bash).filter(
      ([, action]) => action === "deny",
    ),
  ]
  const upstream = await plannotator(
    { directory: fileURLToPath(root) },
    options,
  )
  assert.equal(typeof upstream.tool.submit_plan.execute, "function")
  const local = await permissionPlugin()
  let finalConfig
  for (let run = 0; run < 2; run++) {
    const before = structuredClone(config)
    await upstream.config(config)
    assert.deepEqual(config, before, "user-managed must not change config")
    await local.config(config)
    assert.deepEqual(config.agent.plan.permission, expectedPlan)
    assert.deepEqual(
      Object.entries(config.agent.plan.permission.edit),
      Object.entries(expectedPlan.edit),
    )
    assert.deepEqual(config.permission, globalPermissions)
    assert.equal(config.permission.submit_plan, "deny")
    assert.equal(config.agent.writer.permission.submit_plan, undefined)
    assert.deepEqual(config.agent.writer.permission, {
      ...writerPermissions,
      bash: Object.fromEntries(expectedBash),
    })
    assert.deepEqual(
      Object.entries(config.agent.writer.permission.bash),
      expectedBash,
    )
    if (run === 0) finalConfig = structuredClone(config)
    else assert.deepEqual(config, finalConfig)
  }
})
