import { spawnSync } from "node:child_process";
import { closeSync, constants, openSync, readdirSync, readSync, writeSync } from "node:fs";
import { basename, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

export const usage = `Usage: flipper <command> [options] [args]

Commands:
  port                 Print the serial port and its holders.
  send <line>...        Send CLI lines. Aliases: exec, run.
  ls [path]            List storage (default /ext). Alias: storage.
  info                 Send device_info.
  watch [seconds]      Read output (default 5 seconds).
  release              Terminate known serial-terminal holders.
  help                 Print this usage.

Options:
  --port <path>        Serial device (else FLIPPER_PORT, then discovery).
  --timeout <ms>       Total session timeout (default 5000).
  --idle <ms>          Stop reading after silence (default 800).
  --raw                Keep ANSI escape sequences.
  --json               Print a JSON object.
  --                   Treat remaining arguments as literal values.

Quote each CLI line. Options can appear before or after the command.
Watch ignores --idle; its duration replaces the default timeout.
An explicit --timeout limits watch as well.`;

type Action =
  | { command: "help" | "port" | "release" }
  | { command: "send"; lines: string[] }
  | { command: "ls"; path: string }
  | { command: "info" }
  | { command: "watch"; seconds: number };

export type Options = {
  port?: string;
  timeout: number;
  idle: number;
  raw: boolean;
  json: boolean;
};

export type ParsedArgs = Options & Action;

class UsageError extends Error {}

function positiveNumber(value: string, name: string, integer = true): number {
  const number = Number(value);
  if (!value.trim() || !Number.isFinite(number) || number <= 0 ||
    (integer && !Number.isSafeInteger(number))) {
    throw new UsageError(`${name} must be a positive ${integer ? "integer" : "number"}.`);
  }
  return number;
}

function validatePort(port: string): string {
  if (!port.startsWith("/") || /[\r\n\0]/.test(port)) {
    throw new UsageError("The serial port must be an absolute path without control characters.");
  }
  return port;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const options: Options = { timeout: 5000, idle: 800, raw: false, json: false };
  const args: string[] = [];
  let literal = false;
  let explicitTimeout = false;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === undefined) continue;
    if (literal) {
      args.push(arg);
    } else if (arg === "--") {
      literal = true;
    } else if (arg === "--raw" || arg === "--json") {
      options[arg === "--raw" ? "raw" : "json"] = true;
    } else if (arg === "--port" || arg === "--timeout" || arg === "--idle") {
      const value = argv[++index];
      if (value === undefined || value.startsWith("--")) throw new UsageError(`${arg} needs a value.`);
      if (arg === "--port") options.port = validatePort(value);
      else if (arg === "--timeout") {
        options.timeout = positiveNumber(value, arg);
        explicitTimeout = true;
      } else options.idle = positiveNumber(value, arg);
    } else if (arg === "--help" || arg === "-h") {
      args.push("help");
    } else if (arg.startsWith("-")) {
      throw new UsageError(`Unknown option: ${arg}`);
    } else args.push(arg);
  }

  const [name, ...values] = args;
  const command = name === "exec" || name === "run" ? "send" : name === "storage" ? "ls" : name;
  if (command === "send") {
    if (values.length === 0) throw new UsageError("send needs at least one quoted CLI line.");
    if (values.some((line) => /[\r\n\0]/.test(line))) throw new UsageError("Each send argument must be one CLI line.");
    return { ...options, command, lines: values };
  }
  if (command === "ls") {
    if (values.length > 1) throw new UsageError("ls accepts one path.");
    const path = values[0] ?? "/ext";
    if (!path || /[\r\n\0"]/.test(path)) throw new UsageError("Storage paths must be nonempty and cannot contain quotes or control characters.");
    // The device rejects a trailing slash on nested paths, so trim it.
    return { ...options, command, path: path.replace(/\/+$/, "") || "/" };
  }
  if (command === "watch") {
    if (values.length > 1) throw new UsageError("watch accepts one duration.");
    const seconds = positiveNumber(values[0] ?? "5", "Watch seconds", false);
    if (!Number.isSafeInteger(Math.ceil(seconds * 1000))) throw new UsageError("Watch duration is too large.");
    return { ...options, timeout: explicitTimeout ? options.timeout : seconds * 1000, command, seconds };
  }
  if (command === "help" || command === "port" || command === "release" || command === "info") {
    if (values.length > 0) throw new UsageError(`${command} does not accept arguments.`);
    return { ...options, command };
  }
  throw new UsageError(name ? `Unknown command: ${name}` : "A command is required.");
}

export function discoverPort(input: {
  port?: string;
  env: Readonly<Record<string, string | undefined>>;
  platform: string;
  candidates: readonly string[];
}): string {
  const explicit = input.port ?? input.env.FLIPPER_PORT;
  if (explicit !== undefined && explicit !== "") return validatePort(explicit);
  const candidates = [...input.candidates].sort();
  for (const pattern of [/^\/dev\/cu\.usbmodemflip_[^/]+$/, /^\/dev\/serial\/by-id\/[^/]*Flipper[^/]*$/, /^\/dev\/ttyACM[^/]*$/]) {
    const port = candidates.find((candidate) => pattern.test(candidate));
    if (port) return port;
  }
  throw new Error(`No Flipper serial device found on ${input.platform}. Connect USB or set --port /dev/... or FLIPPER_PORT.`);
}

export function isSerialTerminal(comm: string): boolean {
  return ["screen", "SCREEN", "minicom", "tio", "picocom", "cu", "socat"].includes(basename(comm.trim()));
}

export function stripAnsi(output: string): string {
  return stripVTControlCharacters(output);
}

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function candidates(): string[] {
  return ["/dev", "/dev/serial/by-id"].flatMap((directory) => {
    try {
      return readdirSync(directory).map((name) => join(directory, name));
    } catch (error) {
      if (hasCode(error, "ENOENT")) return [];
      throw error;
    }
  });
}

function run(command: string, args: string[], emptyAllowed = false): string {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw new Error(`${command}: ${result.error.message}`);
  if (result.status === 0) return result.stdout.trim();
  if (emptyAllowed && result.status === 1 && !result.stdout.trim() && !result.stderr.trim()) return "";
  throw new Error(`${command} failed: ${result.stderr.trim() || `exit ${result.status}`}`);
}

type Holder = { pid: number; comm: string; command: string };

function holders(port: string): Holder[] {
  const pids = run("lsof", ["-t", port], true);
  if (!pids) return [];
  return [...new Set(pids.split(/\s+/))].flatMap((value) => {
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 1) {
      throw new Error(`lsof returned an invalid PID: ${value}`);
    }
    const pid = Number(value);
    const comm = run("ps", ["-o", "comm=", "-p", value], true);
    const command = run("ps", ["-o", "command=", "-p", value], true);
    return comm && command ? [{ pid, comm, command }] : [];
  });
}

function describe(list: readonly Holder[]): string {
  return list.map((holder) => `PID ${holder.pid}: ${holder.command}`).join("\n");
}

function busyMessage(port: string, list: readonly Holder[]): string {
  return `${port} is busy.\n${describe(list) || "Holder could not be identified."}\nClose the holder or run flipper release. Other applications must be closed manually.`;
}

type Result = { port: string | null; command: string | null; output: string; busy: boolean | null; error?: string };

async function release(port: string, result: Result): Promise<void> {
  const list = holders(port);
  result.busy = list.length > 0;
  if (!list.length) {
    result.output = `${port} is free.`;
    return;
  }
  const refused = list.filter((holder) => !isSerialTerminal(holder.comm));
  if (refused.length) throw new Error(`Refusing to terminate:\n${describe(refused)}\nClose these applications manually.`);
  for (const holder of list) {
    const current = holders(port).find((entry) => entry.pid === holder.pid);
    if (!current) continue;
    if (current.comm !== holder.comm || current.command !== holder.command || !isSerialTerminal(current.comm)) {
      throw new Error(`Holder changed: ${describe([current])}. Close it manually.`);
    }
    try {
      process.kill(holder.pid, "SIGTERM");
      result.output += `Sent SIGTERM to ${describe([holder])}\n`;
    } catch (error) {
      if (!hasCode(error, "ESRCH")) throw error;
    }
  }
  const deadline = performance.now() + 1000;
  let remaining = holders(port);
  while (remaining.length && performance.now() < deadline) {
    await sleep(50);
    remaining = holders(port);
  }
  result.busy = remaining.length > 0;
  if (result.busy) throw new Error(`Port is still busy:\n${describe(remaining)}\nClose these applications manually.`);
  result.output += `${port} is free.`;
}

async function serial(port: string, args: ParsedArgs, result: Result): Promise<void> {
  const list = holders(port);
  result.busy = list.length > 0;
  if (result.busy) throw new Error(busyMessage(port, list));
  try {
    run("stty", [process.platform === "linux" ? "-F" : "-f", port, "115200", "raw", "-echo"]);
  } catch (error) {
    const current = holders(port);
    if (current.length) {
      result.busy = true;
      throw new Error(busyMessage(port, current));
    }
    throw error;
  }
  let fd: number;
  try {
    fd = openSync(port, constants.O_RDWR | constants.O_NOCTTY | constants.O_NONBLOCK);
  } catch (error) {
    if (!hasCode(error, "EBUSY")) throw error;
    result.busy = true;
    throw new Error(busyMessage(port, holders(port)));
  }
  const chunks: Buffer[] = [];
  try {
    const deadline = performance.now() + (args.command === "watch" ? Math.min(args.timeout, args.seconds * 1000) : args.timeout);
    const buffer = Buffer.alloc(4096);
    const lines = args.command === "send" ? args.lines : args.command === "info" ? ["device_info"] :
      args.command === "ls" ? [`storage list ${/\s/.test(args.path) ? `"${args.path}"` : args.path}`] : [];
    for (const line of lines.length ? lines : [undefined]) {
      if (line !== undefined) {
        const bytes = Buffer.from(`${line}\r\n`);
        let offset = 0;
        while (offset < bytes.length) {
          if (performance.now() >= deadline) throw new Error("Session timeout before all CLI lines were sent.");
          try {
            offset += writeSync(fd, bytes, offset, bytes.length - offset);
          } catch (error) {
            if (!hasCode(error, "EAGAIN") && !hasCode(error, "EWOULDBLOCK")) throw error;
          }
          if (offset < bytes.length) await sleep(15);
        }
      }
      let lastData = performance.now();
      while (performance.now() < deadline) {
        let count = 0;
        try {
          count = readSync(fd, buffer, 0, buffer.length, null);
        } catch (error) {
          if (!hasCode(error, "EAGAIN") && !hasCode(error, "EWOULDBLOCK")) throw error;
        }
        if (count > 0) {
          chunks.push(Buffer.from(buffer.subarray(0, count)));
          lastData = performance.now();
        }
        if (args.command !== "watch" && performance.now() - lastData >= args.idle) break;
        await sleep(15);
      }
    }
  } finally {
    result.output = Buffer.concat(chunks).toString("utf8");
    closeSync(fd);
  }
}

export async function main(argv: string[]): Promise<number> {
  const result: Result = { port: null, command: null, output: "", busy: null };
  let args: ParsedArgs | undefined;
  let exitCode = 0;
  try {
    args = parseArgs(argv);
    result.command = args.command;
    if (args.command === "help") result.output = usage;
    else {
      result.port = discoverPort({ port: args.port, env: process.env, platform: process.platform, candidates: args.port || process.env.FLIPPER_PORT ? [] : candidates() });
      if (args.command === "port") {
        const list = holders(result.port);
        result.busy = list.length > 0;
        result.output = result.busy ? `${result.port} is busy.\n${describe(list)}` : `${result.port} is free.`;
      } else if (args.command === "release") await release(result.port, result);
      else await serial(result.port, args, result);
    }
  } catch (error) {
    exitCode = 1;
    result.error = error instanceof Error ? error.message : String(error);
    if (error instanceof UsageError) result.output = usage;
  }
  if (!args?.raw) result.output = stripAnsi(result.output);
  const optionArgs = argv.slice(0, argv.indexOf("--") < 0 ? argv.length : argv.indexOf("--"));
  if (args?.json || (!args && optionArgs.includes("--json"))) console.log(JSON.stringify(result));
  else {
    if (result.output) process.stdout.write(result.output + (result.output.endsWith("\n") ? "" : "\n"));
    if (result.error) console.error(`flipper: ${result.error}`);
  }
  return exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
