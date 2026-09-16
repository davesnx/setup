import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { profiles, readDeclaration } from "../../agents/mcp.ts";
import { hostTarget, render, toClaude } from "./mcp.ts";

test("maps local and remote servers and drops disabled ones", () => {
  expect(
    toClaude({
      a: { type: "local", command: ["npx", "-y", "pkg"], environment: { KEY: "v" } },
      b: { type: "remote", url: "https://b/mcp", headers: { Authorization: "x" }, oauth: { callbackPort: 1 } },
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

test("hosts/<profile>.json are rendered from agents/mcp.json (fix: node terminal/claude/mcp.ts)", () => {
  const { servers, hosts } = readDeclaration();
  for (const profile of profiles) {
    expect(readFileSync(hostTarget(profile), "utf8")).toBe(render({ ...servers, ...hosts[profile] }));
  }
});

test("a profile carries every shared server plus its own", () => {
  const { servers, hosts } = readDeclaration();
  const shared = Object.keys(toClaude(servers).mcpServers);
  for (const profile of profiles) {
    const rendered = toClaude({ ...servers, ...hosts[profile] }).mcpServers;
    for (const name of shared) expect(rendered).toHaveProperty(name);
    for (const [name, server] of Object.entries(hosts[profile])) {
      expect(name in rendered).toBe(server.enabled !== false);
    }
  }
});
