#!/usr/bin/env bun

import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import sources from "./sources.json";

interface Source {
  file: string;
  url: string;
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

function stripSignedUrlComments(data: Uint8Array): Uint8Array {
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(data);
  const cleaned = text.replace(/^[ \t]*\/\/[^\r\n]*[?&]AWSAccessKeyId=[^\r\n]*(?:\r?\n|$)/gm, "");
  return cleaned === text ? data : new TextEncoder().encode(cleaned);
}

export function metadata(data: Uint8Array): { name: string; version: string } {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
  const header = /^\/\/ ==UserScript==[ \t]*\r?\n([\s\S]*?)^\/\/ ==\/UserScript==[ \t]*\r?$/m.exec(text)?.[1];
  if (header === undefined) throw new Error("Missing userscript metadata");

  let name: string | undefined;
  let version: string | undefined;
  for (const match of header.matchAll(/^\/\/[ \t]+@(name|version)[ \t]+(.+?)[ \t]*\r?$/gm)) {
    if (match[1] === "name") name = match[2];
    if (match[1] === "version") version = match[2];
  }
  if (!name || !version) throw new Error("Missing userscript name or version");
  return { name, version };
}

export async function update(
  entries: readonly Source[],
  root = import.meta.dir,
  request: Fetch = fetch,
): Promise<void> {
  // Validate every download before replacing any of the tracked snapshots.
  const downloads: { file: string; data: Uint8Array }[] = [];
  for (const source of entries) {
    const response = await request(source.url, {
      headers: { "User-Agent": "setup-tampermonkey/1.0" },
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`${source.url}: HTTP ${response.status}`);
    const data = stripSignedUrlComments(new Uint8Array(await response.arrayBuffer()));
    const { name, version } = metadata(data);
    downloads.push({ file: source.file, data });
    console.log(`${name}: ${version} (${data.length.toLocaleString("en-US")} bytes)`);
  }
  for (const { file, data } of downloads) {
    await Bun.write(join(root, "scripts", file), data);
  }
}

export async function bundle(
  entries: readonly Pick<Source, "file">[],
  root = import.meta.dir,
): Promise<string> {
  const files: Record<string, Uint8Array> = {};
  for (const { file } of entries) {
    const data = await Bun.file(join(root, "scripts", file)).bytes();
    metadata(data);
    files[file] = data;
    files[file.replace(/\.user\.js$/, ".options.json")] = strToU8(JSON.stringify({
      options: { check_for_updates: false },
      settings: { enabled: true },
    }));
  }
  const archive = zipSync(files);
  const output = join(root, "dist", "tampermonkey.zip");
  await Bun.write(output, archive);
  console.log(output);
  return output;
}

if (import.meta.main) {
  const [command, ...extra] = process.argv.slice(2);
  if (extra.length || (command !== "update" && command !== "bundle")) {
    console.error("Usage: bun manage.ts <update|bundle>");
    process.exitCode = 2;
  } else {
    try {
      if (command === "update") await update(sources);
      else await bundle(sources);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
