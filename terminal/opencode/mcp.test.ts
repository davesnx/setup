import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { profiles, readDeclaration } from "../../agents/mcp.ts";
import { hostTarget, render, target, toOpenCode } from "./mcp.ts";

test("copies every field, fills enabled, and keeps {env:NAME}", () => {
  expect(
    toOpenCode({
      a: { type: "local", command: ["npx", "pkg"], environment: { KEY: "{env:KEY}" } },
      b: { type: "remote", enabled: false, url: "https://b/mcp", oauth: { callbackPort: 1 } },
    }),
  ).toEqual({
    $schema: "https://opencode.ai/config.json",
    mcp: {
      a: { type: "local", command: ["npx", "pkg"], environment: { KEY: "{env:KEY}" }, enabled: true },
      b: { type: "remote", enabled: false, url: "https://b/mcp", oauth: { callbackPort: 1 } },
    },
  });
});

test("mcp.json and hosts/*.jsonc are rendered from agents/mcp.json (fix: node terminal/opencode/mcp.ts)", () => {
  const declaration = readDeclaration();
  expect(readFileSync(target, "utf8")).toBe(render(declaration.servers));
  for (const profile of profiles) {
    expect(readFileSync(hostTarget(profile), "utf8")).toBe(render(declaration.hosts[profile]));
  }
});
