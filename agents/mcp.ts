// mcp.json declares every MCP server once, in this repository's own format.
// Neither harness reads it: terminal/claude/mcp.ts and terminal/opencode/mcp.ts
// render it into their tool's format. This module reads and validates it for
// both, so a typo fails the check instead of being dropped by one renderer.
// Secrets are written as {env:NAME}; each renderer emits its tool's spelling.
//
// `servers` apply on every machine. `hosts.<profile>` holds per-machine
// additions and overrides, merged over the shared entry of the same name; a
// profile is one of the OpenCode host profiles in terminal/opencode/hosts.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type LocalServer = {
  type: "local";
  enabled?: boolean;
  command: string[];
  environment?: Record<string, string>;
};

export type RemoteServer = {
  type: "remote";
  enabled?: boolean;
  url: string;
  headers?: Record<string, string>;
  // OpenCode only. Claude Code runs its own login flow for HTTP servers.
  oauth?: Record<string, unknown>;
};

export type Server = LocalServer | RemoteServer;

export const profiles = ["local", "ssh"] as const;
export type Profile = (typeof profiles)[number];

export type Declaration = {
  servers: Record<string, Server>;
  // Complete entries per profile: only servers the profile adds or overrides.
  hosts: Record<Profile, Record<string, Server>>;
};

export const source = join(import.meta.dirname, "mcp.json");

const allowed = {
  local: ["type", "enabled", "command", "environment"],
  remote: ["type", "enabled", "url", "headers", "oauth"],
};

function fail(name: string, message: string): never {
  throw new Error(`agents/mcp.json: ${name}: ${message}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isObject(value) && Object.values(value).every((v) => typeof v === "string");
}

function validateServer(name: string, raw: unknown): Server {
  if (!isObject(raw)) fail(name, "must be an object");
  const s = raw;
  if (s.type !== "local" && s.type !== "remote") fail(name, 'type must be "local" or "remote"');
  for (const key of Object.keys(s)) {
    if (!allowed[s.type].includes(key)) fail(name, `unknown key ${key}; allowed: ${allowed[s.type].join(", ")}`);
  }
  if (s.enabled !== undefined && typeof s.enabled !== "boolean") fail(name, "enabled must be a boolean");
  if (s.type === "local") {
    if (!Array.isArray(s.command) || s.command.length === 0 || !s.command.every((c) => typeof c === "string")) {
      fail(name, "command must be a non-empty array of strings");
    }
    if (s.environment !== undefined && !isStringMap(s.environment)) fail(name, "environment must map names to strings");
  } else {
    if (typeof s.url !== "string" || s.url === "") fail(name, "url must be a non-empty string");
    if (s.headers !== undefined && !isStringMap(s.headers)) fail(name, "headers must map names to strings");
    if (s.oauth !== undefined && !isObject(s.oauth)) fail(name, "oauth must be an object");
  }
  return s as unknown as Server;
}

// One level of nesting is enough: server fields, and the maps inside them.
function merge(base: unknown, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = isObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(patch)) {
    out[key] = isObject(value) && isObject(out[key]) ? { ...out[key], ...value } : value;
  }
  return out;
}

export function validate(input: unknown): Declaration {
  const servers = isObject(input) ? input.servers : undefined;
  if (!isObject(servers)) throw new Error("agents/mcp.json: expected { servers: { <name>: { type, ... } } }");
  const shared: Record<string, Server> = {};
  for (const [name, raw] of Object.entries(servers)) shared[name] = validateServer(name, raw);

  const hosts = { local: {}, ssh: {} } as Declaration["hosts"];
  const rawHosts = (input as { hosts?: unknown }).hosts ?? {};
  if (!isObject(rawHosts)) throw new Error("agents/mcp.json: hosts must be an object keyed by profile");
  for (const [profile, entries] of Object.entries(rawHosts)) {
    if (!(profiles as readonly string[]).includes(profile)) {
      throw new Error(`agents/mcp.json: hosts.${profile}: unknown profile; allowed: ${profiles.join(", ")}`);
    }
    if (!isObject(entries)) throw new Error(`agents/mcp.json: hosts.${profile}: must map server names to overrides`);
    for (const [name, patch] of Object.entries(entries)) {
      if (!isObject(patch)) fail(`hosts.${profile}.${name}`, "must be an object");
      hosts[profile as Profile][name] = validateServer(`hosts.${profile}.${name}`, merge(shared[name], patch));
    }
  }
  return { servers: shared, hosts };
}

export function readDeclaration(): Declaration {
  return validate(JSON.parse(readFileSync(source, "utf8")));
}

export function readServers(): Record<string, Server> {
  return readDeclaration().servers;
}

// True when the renderer runs as a script, under Node or Bun, not when imported by a test.
export function isMain(moduleUrl: string): boolean {
  const script = process.argv[1];
  return script !== undefined && resolve(script) === fileURLToPath(moduleUrl);
}

// The installers run the renderers on every install. An identical rewrite is
// still a write, and Claude Code's sandbox refuses it for the file that
// ~/.mcp.json links to, so an unchanged render must not open the file.
export function writeIfChanged(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, "utf8") === content) return false;
  writeFileSync(path, content);
  return true;
}
