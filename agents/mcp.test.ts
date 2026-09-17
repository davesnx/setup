import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDeclaration, validate, writeIfChanged } from "./mcp.ts";

test("the checked-in declaration validates", () => {
  const { servers, hosts } = readDeclaration();
  expect(Object.keys(servers).length).toBeGreaterThan(0);
  expect(Object.keys(hosts.local).length + Object.keys(hosts.ssh).length).toBeGreaterThan(0);
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
