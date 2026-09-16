import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

const opencode = Bun.which("opencode");

for (const profile of profiles) {
  test.skipIf(!opencode)(`OpenCode accepts mcp.json merged with the ${profile} profile`, () => {
    // An empty HOME keeps the real OpenCode state out of the check. The shared
    // file sits where the installer links it; the profile comes in as
    // OPENCODE_CONFIG, the way the login shell provides it.
    const home = mkdtempSync(join(tmpdir(), `mcp-opencode-${profile}-`));
    const config = join(home, "config", "opencode");
    mkdirSync(config, { recursive: true });
    cpSync(target, join(config, "opencode.json"));
    const result = spawnSync(opencode as string, ["debug", "config"], {
      encoding: "utf8",
      timeout: 60_000,
      env: {
        ...process.env,
        HOME: home,
        XDG_CONFIG_HOME: join(home, "config"),
        XDG_DATA_HOME: join(home, "data"),
        XDG_STATE_HOME: join(home, "state"),
        XDG_CACHE_HOME: join(home, "cache"),
        OPENCODE_CONFIG: hostTarget(profile),
      },
    });
    expect(result.stdout + result.stderr).not.toContain("Configuration is invalid");
    expect(result.status).toBe(0);
    const { servers, hosts } = readDeclaration();
    const loaded = JSON.parse(result.stdout).mcp as Record<string, unknown>;
    expect(Object.keys(loaded).sort()).toEqual([...new Set([...Object.keys(servers), ...Object.keys(hosts[profile])])].sort());
    // OpenCode resolves {env:NAME} while loading, so compare everything but the secret maps.
    for (const [name, server] of Object.entries(hosts[profile])) {
      const { environment: _e, headers: _h, ...stable } = server as Record<string, unknown>;
      expect(loaded[name]).toMatchObject(stable);
    }
  });
}
