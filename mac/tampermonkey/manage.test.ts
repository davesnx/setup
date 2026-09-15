import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strFromU8, strToU8, unzipSync } from "fflate";
import { bundle, metadata, update } from "./manage";

const SCRIPT = "// ==UserScript==\n// @name Test\n// @version 1\n// ==/UserScript==\n";
const SOURCES = [
  { file: "first.user.js", url: "https://example.com/first.user.js" },
  { file: "second.user.js", url: "https://example.com/second.user.js" },
];

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "tampermonkey-test-"));
  await mkdir(join(root, "scripts"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

test.each(["network", "http", "html"])("a %s failure preserves existing snapshots", async (failure) => {
  const original = join(root, "scripts", "first.user.js");
  await writeFile(original, "original snapshot");
  await expect(update(SOURCES, root, async (url) => {
    if (url.endsWith("first.user.js")) return new Response(SCRIPT);
    if (failure === "network") throw new Error("offline");
    if (failure === "http") return new Response("unavailable", { status: 503 });
    return new Response("<!doctype html><title>Service unavailable</title>");
  })).rejects.toThrow();
  expect(await readFile(original, "utf8")).toBe("original snapshot");
  expect(await Bun.file(join(root, "scripts", "second.user.js")).exists()).toBe(false);
});

test("updates can be retried and bundled without changing script bytes", async () => {
  for (let attempt = 0; attempt < 2; attempt++) {
    await update(SOURCES, root, async () => new Response(SCRIPT));
    const archive = unzipSync(await readFile(await bundle(SOURCES, root)));
    expect(Object.keys(archive).sort()).toEqual([
      "first.options.json", "first.user.js", "second.options.json", "second.user.js",
    ]);
    for (const { file } of SOURCES) {
      expect(archive[file]).toEqual(strToU8(SCRIPT));
      const options = archive[file.replace(".user.js", ".options.json")];
      if (!options) throw new Error(`Missing options for ${file}`);
      expect(JSON.parse(strFromU8(options))).toEqual({
        options: { check_for_updates: false },
        settings: { enabled: true },
      });
    }
  }
});

test("metadata supports BOM and CRLF and rejects incomplete headers", () => {
  expect(metadata(strToU8(`\uFEFF${SCRIPT.replaceAll("\n", "\r\n")}`)))
    .toEqual({ name: "Test", version: "1" });
  expect(() => metadata(strToU8(SCRIPT.replace("// @version 1\n", ""))))
    .toThrow("Missing userscript name or version");
});

test("updates strip signed example URL comments without changing executable code", async () => {
  const code = 'const url = "https://example.com/?AWSAccessKeyId=example";\r\n';
  const example = "\t// https://example.com/image?AWSAccessKeyId=example&Signature=example\r\n";
  const header = `\uFEFF${SCRIPT.replaceAll("\n", "\r\n")}`;
  await update(SOURCES, root, async () => new Response(header + example + code));
  expect(await readFile(join(root, "scripts", "first.user.js"), "utf8"))
    .toBe(header + code);
});

test("invalid local metadata preserves an existing bundle", async () => {
  await mkdir(join(root, "dist"));
  const output = join(root, "dist", "tampermonkey.zip");
  await writeFile(output, "previous bundle");
  await writeFile(join(root, "scripts", "invalid.user.js"), "not a userscript");
  await expect(bundle([{ file: "invalid.user.js" }], root)).rejects.toThrow();
  expect(await readFile(output, "utf8")).toBe("previous bundle");
});
