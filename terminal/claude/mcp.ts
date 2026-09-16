// Renders Claude Code's MCP files from agents/mcp.json. Claude Code reads one
// file per machine with no layering, so each host profile gets a complete
// list: the shared servers merged with that profile's additions and
// overrides. The installer links the machine's profile to ~/.mcp.json.
// Claude Code's format is `mcpServers`, `command` plus `args`, `env`,
// `type: "http"`, and `${NAME}` secrets. It has no `enabled` or `oauth`, so
// disabled servers are left out and OAuth stays with Claude Code's own login
// flow; agents/README.md covers the callback port on nspawn.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isMain, profiles, readDeclaration } from "../../agents/mcp.ts";
import type { Server } from "../../agents/mcp.ts";

type StdioServer = { command: string; args: string[]; env?: Record<string, string> };
type HttpServer = { type: "http"; url: string; headers?: Record<string, string> };
export type ClaudeConfig = { mcpServers: Record<string, StdioServer | HttpServer> };

export const hostsDir = join(import.meta.dirname, "hosts");
export const hostTarget = (profile: string): string => join(hostsDir, `${profile}.json`);

export function toClaude(servers: Record<string, Server>): ClaudeConfig {
  const mcpServers: ClaudeConfig["mcpServers"] = {};
  for (const [name, server] of Object.entries(servers)) {
    if (server.enabled === false) continue;
    if (server.type === "local") {
      const [command, ...args] = server.command;
      const entry: StdioServer = { command: command as string, args };
      if (server.environment) entry.env = server.environment;
      mcpServers[name] = entry;
    } else {
      const entry: HttpServer = { type: "http", url: server.url };
      if (server.headers) entry.headers = server.headers;
      mcpServers[name] = entry;
    }
  }
  return { mcpServers };
}

export function render(servers: Record<string, Server>): string {
  const json = JSON.stringify(toClaude(servers), null, 2).replaceAll(
    /\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_, name: string) => "${" + name + "}",
  );
  return `${json}\n`;
}

if (isMain(import.meta.url)) {
  const declaration = readDeclaration();
  mkdirSync(hostsDir, { recursive: true });
  for (const profile of profiles) {
    writeFileSync(hostTarget(profile), render({ ...declaration.servers, ...declaration.hosts[profile] }));
  }
}
