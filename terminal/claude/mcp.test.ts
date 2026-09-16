import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { readSource, render, target, toClaude } from "./mcp.ts";

test("maps local and remote servers and drops disabled ones", () => {
  expect(
    toClaude({
      a: { type: "local", command: ["npx", "-y", "pkg"], environment: { KEY: "v" } },
      b: { type: "remote", url: "https://b/mcp", headers: { Authorization: "x" } },
      c: { type: "remote", enabled: false, url: "https://c/mcp" },
    }),
  ).toEqual({
    mcpServers: {
      a: { command: "npx", args: ["-y", "pkg"], env: { KEY: "v" } },
      b: { type: "http", url: "https://b/mcp", headers: { Authorization: "x" } },
    },
  });
});

test("renders {env:NAME} references as ${NAME}", () => {
  const out = render({ b: { type: "remote", url: "https://b/mcp", headers: { Key: "{env:B_TOKEN}" } } });
  expect(out).toContain('"Key": "${B_TOKEN}"');
  expect(out).not.toContain("{env:");
});

test(".mcp.json is rendered from agents/mcp.json (fix: bun terminal/claude/mcp.ts)", () => {
  expect(readFileSync(target, "utf8")).toBe(render(readSource()));
});
