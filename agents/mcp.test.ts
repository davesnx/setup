import { expect, test } from "bun:test";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { readDeclaration, validate, writeIfChanged } from "./mcp.ts";
import * as mcp from "./mcp.ts";

test("the checked-in declaration validates", () => {
  const { servers, hosts } = readDeclaration();
  expect(Object.keys(servers).length).toBeGreaterThan(0);
  expect(Object.keys(hosts.local).length + Object.keys(hosts.ssh).length).toBeGreaterThan(0);
});

test.each([
  ["host", { ssh: { a: { type: "local", command: ["x"] } } }],
  ["mcp", {}],
  ["unexpected", null],
])("rejects unknown root key %s even with valid servers and hosts", (key, value) => {
  expect(() => validate({ servers: {}, hosts: {}, [key]: value })).toThrow(`unknown key ${key}`);
});

test("rejects a misspelled hosts key instead of returning empty profiles", () => {
  expect(() =>
    validate({
      servers: { a: { type: "remote", url: "https://a/mcp" } },
      host: { ssh: { a: { enabled: false } } },
    }),
  ).toThrow("unknown key host");
});

test.each([undefined, null, false, 1, "config", [], {}, { hosts: {} }].map((input) => [input]))(
  "rejects invalid declaration shape %j",
  (input) => {
    expect(() => validate(input)).toThrow("servers");
  },
);

test.each([undefined, null, false, 1, "servers", []].map((servers) => [servers]))("rejects invalid servers map %j", (servers) => {
  expect(() => validate({ servers })).toThrow("servers");
});

test.each([{}, { hosts: undefined }, { hosts: null }, { hosts: {} }, { hosts: { local: {} } }, { hosts: { ssh: {} } }])(
  "preserves empty host defaults for %j",
  (input) => {
    expect(validate({ servers: {}, ...input })).toEqual({ servers: {}, hosts: { local: {}, ssh: {} } });
  },
);

test.each([false, 1, "hosts", []].map((hosts) => [hosts]))("rejects invalid hosts map %j", (hosts) => {
  expect(() => validate({ servers: {}, hosts })).toThrow("hosts must be an object keyed by profile");
});

test("rejects what neither renderer can use", () => {
  expect(() => validate({ mcp: {} })).toThrow("servers");
  expect(() => validate({ servers: { a: { type: "sse", url: "https://a/mcp" } } })).toThrow("type");
  expect(() => validate({ servers: { a: { type: "remote" } } })).toThrow("url");
  expect(() => validate({ servers: { a: { type: "local", command: [] } } })).toThrow("command");
  expect(() => validate({ servers: { a: { type: "remote", url: "https://a/mcp", timeout: 5 } } })).toThrow(
    "unknown key timeout",
  );
  expect(() => validate({ servers: { a: { type: "local", command: ["x"], enabled: "yes" } } })).toThrow("enabled");
});

test("host overrides merge over the shared entry and must complete it", () => {
  const { hosts } = validate({
    servers: { a: { type: "remote", url: "https://a/mcp", oauth: { scope: "read" } } },
    hosts: {
      ssh: {
        a: { oauth: { callbackPort: 1 } },
        b: { type: "local", enabled: false, command: ["x"] },
      },
    },
  });
  expect(hosts.ssh).toEqual({
    a: { type: "remote", url: "https://a/mcp", oauth: { scope: "read", callbackPort: 1 } },
    b: { type: "local", enabled: false, command: ["x"] },
  });
  expect(hosts.local).toEqual({});
  expect(() => validate({ servers: {}, hosts: { prod: {} } })).toThrow("unknown profile");
  expect(() => validate({ servers: {}, hosts: { ssh: { c: { oauth: { callbackPort: 1 } } } } })).toThrow(
    "hosts.ssh.c: type",
  );
});

test("writeIfChanged creates, skips an identical file, and rewrites a changed one", () => {
  const path = join(mkdtempSync(join(tmpdir(), "mcp-write-")), "out.json");
  expect(writeIfChanged(path, "a\n")).toBe(true);
  const written = statSync(path, { bigint: true }).mtimeNs;
  expect(writeIfChanged(path, "a\n")).toBe(false);
  expect(statSync(path, { bigint: true }).mtimeNs).toBe(written);
  expect(writeIfChanged(path, "b\n")).toBe(true);
  expect(readFileSync(path, "utf8")).toBe("b\n");
});

const browserCommand = ["npx", "--no-usage-statistics", "--browser-url=http://127.0.0.1:9333", "chrome-devtools-mcp"];
function browserDeclaration(command = browserCommand, hosts = {}) {
  return { servers: { "chrome-devtools": { type: "local", command } }, hosts };
}

test("MCP imports do not treat eval arguments as script paths", () => {
  const moduleUrl = new URL("./mcp.ts", import.meta.url).href;
  const result = spawnSync("node", [
    "--input-type=module", "-e", `await import(${JSON.stringify(moduleUrl)}); console.log("imported")`,
    "nonexistent-mcp-eval-argument",
  ], { encoding: "utf8", timeout: 10_000 });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("imported\n");
});

test("browser-url CLI reads the adjacent declaration under Node, independent of cwd and DOTFILES_PATH", () => {
  const root = mkdtempSync(join(tmpdir(), "browser-url-"));
  const directory = join(root, "agents");
  mkdirSync(directory);
  try {
    const script = join(directory, "mcp.ts");
    copyFileSync(join(import.meta.dirname, "mcp.ts"), script);
    const invoke = (...args: string[]) => spawnSync("node", [script, ...args], {
      cwd: tmpdir(), encoding: "utf8", env: { ...process.env, DOTFILES_PATH: "/wrong/checkout" },
    });
    writeFileSync(join(directory, "mcp.json"), JSON.stringify(browserDeclaration()));
    const result = invoke("browser-url");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("http://127.0.0.1:9333\n");

    const link = join(root, "reader.ts");
    symlinkSync(script, link);
    const linked = spawnSync("node", [link, "browser-url"], { encoding: "utf8" });
    expect(linked.status).toBe(0);
    expect(linked.stdout).toBe(result.stdout);

    const examples = [
      "README.md", "skills/playwright-cli/SKILL.md", "skills/playwright-cli/references/session-management.md",
      "skills/playwright-cli/references/browser-commands.md",
    ].map((file) => {
      const content = readFileSync(join(import.meta.dirname, file), "utf8");
      const command = content.match(/CDP_URL=\$\(node .* browser-url\) &&\n\s+playwright-cli[^\n]+/);
      if (!command) throw new Error(`${file}: missing guarded browser-url attach example`);
      return command[0];
    });
    const attach = (command: string) => spawnSync("bash", ["-c", `playwright-cli() { printf 'attached:%s\\n' "$*"; }; ${command}`], {
      encoding: "utf8", env: { ...process.env, DOTFILES_PATH: root },
    });
    for (const command of examples) {
      const attached = attach(command);
      expect(attached.status).toBe(0);
      expect(attached.stdout).toContain("--cdp=http://127.0.0.1:9333");
    }

    writeFileSync(join(directory, "mcp.json"), JSON.stringify(browserDeclaration(["npx"])));
    const invalid = invoke("browser-url");
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toBe("");
    expect(invalid.stderr).toContain("agents/mcp.json");
    expect(invalid.stderr).toContain("--browser-url");
    for (const command of examples) {
      const attached = attach(command);
      expect(attached.status).toBe(1);
      expect(attached.stdout).toBe("");
      expect(attached.stderr).toContain("--browser-url");
    }

    const usage = invoke("unknown");
    expect(usage.status).toBe(1);
    expect(usage.stdout).toBe("");
    expect(usage.stderr).toContain("browser-url");

    rmSync(join(directory, "mcp.json"));
    const missing = invoke("browser-url");
    expect(missing.status).toBe(1);
    expect(missing.stdout).toBe("");
    expect(missing.stderr).toContain("mcp.json");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("browser endpoint follows reordered command args and effective host entries", () => {
  for (const profile of ["local", "ssh"]) {
    for (const patch of [{}, { enabled: false }, { environment: { TEST: "value" } }, { command: [...browserCommand].reverse() }]) {
      expect(mcp.browserUrl(validate(browserDeclaration(browserCommand, { [profile]: { "chrome-devtools": patch } })))).toBe("http://127.0.0.1:9333");
    }
    for (const enabled of [true, false]) {
      const declaration = validate(browserDeclaration(browserCommand, {
        [profile]: { "chrome-devtools": { enabled, command: ["npx", "--browser-url=http://127.0.0.1:9444"] } },
      }));
      expect(() => mcp.browserUrl(declaration)).toThrow(`hosts.${profile}.chrome-devtools`);
    }
  }
});

test.each([1, 80, 65535])("browser endpoint keeps valid explicit port %s", (port) => {
  expect(mcp.browserUrl(validate(browserDeclaration([`--browser-url=http://127.0.0.1:${port}`])))).toBe(`http://127.0.0.1:${port}`);
});

test.each([
  "http://127.0.0.1", "https://127.0.0.1:9333", "http://localhost:9333", "http://0.0.0.0:9333",
  "http://user@127.0.0.1:9333", "http://127.0.0.1:9333/", "http://127.0.0.1:9333?x=1", "http://127.0.0.1:9333\n",
  ...["0", "65536", "-1", "1.5", "abc", "09333", "99999999999999999999"].map((port) => `http://127.0.0.1:${port}`), "",
])("rejects unsupported browser endpoint %s", (url) => {
  expect(() => mcp.browserUrl(validate(browserDeclaration([`--browser-url=${url}`])))).toThrow("--browser-url");
});

test.each([
  ["npx"], ["npx", "--browser-url", "http://127.0.0.1:9333"],
  ["--browser-url=http://127.0.0.1:9333", "--browser-url=http://127.0.0.1:9333"],
].map((command) => [command]))("rejects missing, split, or duplicate browser URL %j", (command) => {
  expect(() => mcp.browserUrl(validate(browserDeclaration(command)))).toThrow("--browser-url");
});

test("browser endpoint requires a local shared server", () => {
  expect(() => mcp.browserUrl(validate({ servers: {} }))).toThrow("chrome-devtools");
  expect(() => mcp.browserUrl(validate({ servers: { "chrome-devtools": { type: "remote", url: "https://example.com" } } }))).toThrow("local");
});
