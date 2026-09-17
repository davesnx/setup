// Renders the OpenCode MCP config from agents/mcp.json. The installer links
// mcp.json to ~/.config/opencode/opencode.json, which OpenCode deep-merges with
// opencode.jsonc, and links the machine's profile from hosts/ to host.jsonc,
// which the login shell exports as OPENCODE_CONFIG. OpenCode validates each
// file on its own, so a profile carries complete entries, not partial patches.
// OpenCode keeps `{env:NAME}` secrets as written and requires `enabled` on
// every server, so the mapping is a copy with that default filled in.
import { join } from "node:path";
import { isMain, profiles, readDeclaration, writeIfChanged } from "../../agents/mcp.ts";
import type { Server } from "../../agents/mcp.ts";

export type OpenCodeConfig = { $schema: string; mcp: Record<string, Server & { enabled: boolean }> };

export const target = join(import.meta.dirname, "mcp.json");
export const hostTarget = (profile: string): string => join(import.meta.dirname, "hosts", `${profile}.jsonc`);

export function toOpenCode(servers: Record<string, Server>): OpenCodeConfig {
  const mcp: OpenCodeConfig["mcp"] = {};
  for (const [name, server] of Object.entries(servers)) {
    mcp[name] = { ...server, enabled: server.enabled ?? true };
  }
  return { $schema: "https://opencode.ai/config.json", mcp };
}

export function render(servers: Record<string, Server>): string {
  return `${JSON.stringify(toOpenCode(servers), null, 2)}\n`;
}

if (isMain(import.meta.url)) {
  const declaration = readDeclaration();
  writeIfChanged(target, render(declaration.servers));
  for (const profile of profiles) writeIfChanged(hostTarget(profile), render(declaration.hosts[profile]));
}
