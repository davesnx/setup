// Renders Claude Code's .mcp.json from the shared agents/mcp.json.
// The source uses OpenCode's schema because it carries `enabled` and `oauth`,
// which .mcp.json cannot express, and OpenCode has no way to read .mcp.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Server = {
  type: "local" | "remote";
  enabled?: boolean;
  command?: string[];
  environment?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
};

type StdioServer = { command: string; args: string[]; env?: Record<string, string> };
type HttpServer = { type: "http"; url: string; headers?: Record<string, string> };

export const source = join(import.meta.dir, "..", "..", "agents", "mcp.json");
export const target = join(import.meta.dir, ".mcp.json");

export function toClaude(mcp: Record<string, Server>): { mcpServers: Record<string, StdioServer | HttpServer> } {
  const mcpServers: Record<string, StdioServer | HttpServer> = {};
  for (const [name, server] of Object.entries(mcp)) {
    if (server.enabled === false) continue;
    if (server.type === "local") {
      const [command, ...args] = server.command ?? [];
      if (!command) throw new Error(`${name}: local server needs a command`);
      const entry: StdioServer = { command, args };
      if (server.environment) entry.env = server.environment;
      mcpServers[name] = entry;
    } else {
      if (!server.url) throw new Error(`${name}: remote server needs a url`);
      const entry: HttpServer = { type: "http", url: server.url };
      if (server.headers) entry.headers = server.headers;
      mcpServers[name] = entry;
    }
  }
  return { mcpServers };
}

export function render(mcp: Record<string, Server>): string {
  // OpenCode expands secrets written as {env:NAME}; Claude Code expands the same reference as ${NAME}.
  const json = JSON.stringify(toClaude(mcp), null, 2).replaceAll(
    /\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_, name: string) => "${" + name + "}",
  );
  return `${json}\n`;
}

export function readSource(): Record<string, Server> {
  return (JSON.parse(readFileSync(source, "utf8")) as { mcp: Record<string, Server> }).mcp;
}

if (import.meta.main) writeFileSync(target, render(readSource()));
