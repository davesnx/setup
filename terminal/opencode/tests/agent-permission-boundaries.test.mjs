import assert from "node:assert/strict"
import test from "node:test"

import permissionPlugin from "../agent-permission-boundaries.mjs"

const { config: restoreAgentPermissionBoundaries } = await permissionPlugin()

test("Plan keeps only its declared edit paths", () => {
  const config = {
    agent: {
      plan: {
        permission: {
          edit: {
            "*": "deny",
            "plans/*_PLAN.md": "allow",
            "*.md": "allow",
          },
        },
      },
    },
  }

  restoreAgentPermissionBoundaries(config)

  assert.deepEqual(config.agent.plan.permission.edit, {
    "*": "deny",
    "plans/*_PLAN.md": "allow",
  })
})

test("Writer asks by default but inherits every global hard Bash deny", () => {
  const config = {
    permission: {
      bash: {
        "*": "allow",
        "safe *": "ask",
        "dangerous *": "deny",
        "secret *": "deny",
      },
    },
    agent: {
      writer: {
        permission: { bash: "ask" },
      },
    },
  }

  restoreAgentPermissionBoundaries(config)

  assert.deepEqual(config.agent.writer.permission.bash, {
    "*": "ask",
    "dangerous *": "deny",
    "secret *": "deny",
  })
})

test("Writer-specific hard denies remain last after repeated configuration", () => {
  const config = {
    permission: { bash: { "blocked *": "deny" } },
    agent: {
      writer: {
        permission: {
          bash: {
            "blocked *": "ask",
            "*": "ask",
            "writer-only *": "deny",
          },
        },
      },
    },
  }

  restoreAgentPermissionBoundaries(config)
  restoreAgentPermissionBoundaries(config)

  assert.deepEqual(Object.entries(config.agent.writer.permission.bash), [
    ["*", "ask"],
    ["writer-only *", "deny"],
    ["blocked *", "deny"],
  ])
})
