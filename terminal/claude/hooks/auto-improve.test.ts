import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { text } from "node:stream/consumers";
import { afterEach, beforeEach, describe, test } from "node:test";
import koffi from "koffi";

const ROOT = resolve(import.meta.dirname, "../../..");
const HOOK = join(ROOT, "terminal/claude/hooks/auto-improve.ts");
const OLD_HOOK = join(ROOT, "terminal/claude/hooks/auto-improve.py");
const NPM_ARGS = [
  "ci",
  "--prefix",
  join(ROOT, "terminal/claude/hooks"),
  "--omit=dev",
  "--no-audit",
  "--no-fund",
];
const LIBC =
  process.platform === "darwin" ? "/usr/lib/libSystem.B.dylib" : "libc.so.6";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

describe("Claude auto-improve", () => {
  let temporary: string;
  let home: string;
  let hookDirectory: string;
  let installedHook: string;
  let stateRoot: string;
  let directory: string;
  let bin: string;
  let env: Record<string, string | undefined>;

  beforeEach(() => {
    temporary = mkdtempSync(join(tmpdir(), "auto-improve-test-"));
    home = join(temporary, "home with spaces");
    mkdirSync(home);
    writeFileSync(join(home, "package.json"), '{"type":"module"}');
    hookDirectory = join(home, ".claude/hooks");
    installedHook = join(hookDirectory, "auto-improve.ts");
    mkdirSync(hookDirectory, { recursive: true });
    bin = join(home, "bin");
    mkdirSync(bin);
    writeFileSync(
      join(bin, "npm"),
      '#!/bin/sh\nprintf "%s\\n" "$@" >> "$NPM_TEST_LOG"\nexit "${NPM_TEST_EXIT_CODE:-0}"\n',
      { mode: 0o700 },
    );
    // A stub so an issued review never shells out to the real Claude Code CLI.
    writeFileSync(
      join(bin, "claude"),
      `#!/bin/sh
printf 'stub report\n'
exit 0
`,
      { mode: 0o700 },
    );
    stateRoot = join(home, "state");
    directory = join(stateRoot, "auto-improve/claude");
    env = {
      ...process.env,
      HOME: home,
      XDG_STATE_HOME: stateRoot,
      PATH: `${bin}:${dirname(process.execPath)}:${process.env.PATH ?? ""}`,
      NPM_TEST_LOG: join(home, "npm-args"),
      NPM_TEST_EXIT_CODE: "0",
      // terminal/claude/install.sh reads this rather than recomputing it; an
      // ambient value from the caller's own shell would install symlinks
      // that point outside this checkout.
      DOTFILES_PATH: ROOT,
      // A worktree's node_modules here is a symlink to another checkout's.
      // Loading koffi's native addon through that symlink, after this
      // process has already read stdin once, resolves to a build missing
      // its exports on this Node version; preserving symlinks avoids the
      // realpath lookup that triggers it.
      NODE_OPTIONS: "--preserve-symlinks",
    };
  });

  afterEach(async () => {
    // A detached reviewer from this test may still be writing its report;
    // retry past the transient ENOTEMPTY that races with it.
    for (let attempt = 0; ; attempt++) {
      try {
        rmSync(temporary, { recursive: true, force: true });
        return;
      } catch (error) {
        if (attempt >= 20) throw error;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
  });

  function event(
    name: string,
    promptId = "p1",
    session = "session",
    fields: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      hook_event_name: name,
      session_id: session,
      prompt_id: promptId,
      stop_hook_active: false,
      ...fields,
    };
  }

  async function run(command: string[], input = "") {
    const child = spawn(command[0], command.slice(1), {
      stdio: "pipe",
      env,
      cwd: home,
      timeout: 5000,
      killSignal: "SIGKILL",
    });
    const inputWritten = new Promise<void>((resolve, reject) => {
      const finish = (error?: NodeJS.ErrnoException | null) => {
        // A failed command can exit without reading the hook payload.
        if (error && error.code !== "EPIPE") reject(error);
        else resolve();
      };
      child.stdin.on("error", finish);
      child.stdin.end(input, finish);
    });
    const [[exitCode, signal], stdout, stderr] = await Promise.all([
      once(child, "close"),
      text(child.stdout),
      text(child.stderr),
      inputWritten,
    ]);
    assert.equal(signal, null, `Child exited with ${signal}: ${stderr}`);
    return { exitCode, stdout, stderr };
  }

  function invoke(
    payload: Record<string, unknown> | string,
    command = [process.execPath, HOOK],
  ) {
    return run(
      command,
      typeof payload === "string" ? payload : JSON.stringify(payload),
    );
  }

  function invokeSettings(name: string, payload = event(name)) {
    const { hooks } = JSON.parse(
      readFileSync(join(ROOT, "terminal/claude/settings.json"), "utf8"),
    );
    const hook = hooks[name][0].hooks[0];
    assert.equal(hook.type, "command");
    assert.equal(hook.timeout, 5);
    assert.equal(
      hook.command,
      'node "$HOME/.claude/hooks/auto-improve.ts" || true',
    );
    return invoke(payload, ["/bin/sh", "-c", hook.command]);
  }

  async function quiet(payload: Record<string, unknown>) {
    assert.deepEqual(await invoke(payload), {
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
  }

  function failedClosed(result: Awaited<ReturnType<typeof run>>) {
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /auto-improve:/);
    assert.doesNotMatch(result.stderr, /SECRET/);
  }

  async function complete(prompt: string, session = "session") {
    await quiet(event("UserPromptSubmit", prompt, session));
    const result = await invoke(event("Stop", prompt, session));
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    return result.stdout;
  }

  function statePath(session = "session") {
    return join(directory, `${hash(session)}.json`);
  }

  function lockPath() {
    return join(directory, `${hash("session")}.lock`);
  }

  function state() {
    return JSON.parse(readFileSync(statePath(), "utf8"));
  }

  function names(): Set<string> {
    try {
      return new Set(readdirSync(directory));
    } catch {
      return new Set(); // Not created yet: no session has completed a prompt.
    }
  }

  // Report generation is async and detached; poll for it instead of a fixed wait.
  async function waitForNew(
    predicate: (name: string) => boolean,
    before: Set<string>,
    timeoutMs = 5000,
  ): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const match = readdirSync(directory).find(
        (name) => predicate(name) && !before.has(name),
      );
      if (match) return match;
      if (Date.now() > deadline) {
        throw new Error("timed out waiting for a new matching file");
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  function installHook() {
    return run(["sh", join(ROOT, "terminal/claude/install.sh")]);
  }

  test("three completions and continuation", async () => {
    assert.equal(await complete("p1"), "");
    assert.equal(await complete("p2"), "");
    assert.equal(await complete("p3"), "");
    await quiet(event("Stop", "p3", "session", { stop_hook_active: true }));
    await quiet(event("Stop", "p3"));
    assert.equal(state().issued, true);
  });

  test("pending or declined review never repeats after restart", async () => {
    await complete("p1");
    await complete("p2");
    assert.equal(await complete("p3"), "");
    const issued = readFileSync(statePath());
    assert.equal(JSON.parse(issued.toString()).issued, true);
    for (let prompt = 4; prompt < 12; prompt++) {
      assert.equal(await complete(String(prompt)), "");
    }
    assert.deepEqual(readFileSync(statePath()), issued);
  });

  test("duplicate submissions and stops do not count", async () => {
    await complete("p1");
    await quiet(event("Stop", "p1"));
    await quiet(event("UserPromptSubmit", "p2"));
    await quiet(event("UserPromptSubmit", "p2"));
    await quiet(event("UserPromptSubmit", "p1"));
    await quiet(event("Stop", "p1"));
    await quiet(event("Stop", "p2"));
    assert.equal(state().completed_prompt_ids.length, 2);
    assert.equal(await complete("p3"), "");
    assert.equal(state().issued, true);
  });

  test("fresh session is independent", async () => {
    for (const session of ["session", "fresh-session"]) {
      assert.equal(await complete("p1", session), "");
      assert.equal(await complete("p2", session), "");
      assert.equal(await complete("p3", session), "");
      assert.equal(
        JSON.parse(readFileSync(statePath(session), "utf8")).issued,
        true,
      );
    }
    assert.equal(
      readdirSync(directory).filter((name) => name.endsWith(".json")).length,
      2,
    );
  });

  test("identical text with distinct IDs and private state", async () => {
    const before = names();
    for (const prompt of ["p1", "p2", "p3"]) {
      await quiet(
        event("UserPromptSubmit", prompt, "../SECRET-session", {
          prompt: "SECRET same text",
          transcript_path: "/SECRET/transcript",
        }),
      );
      const result = await invoke(event("Stop", prompt, "../SECRET-session"));
      assert.equal(result.exitCode, 0);
      assert.equal(result.stderr, "");
      assert.equal(result.stdout, "");
    }
    // The reviewer artifacts land in the same directory; wait for them too.
    await waitForNew(
      (name) => name.endsWith(".report.md") || name.endsWith(".failed.md"),
      before,
    );
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      assert.doesNotMatch(name, /SECRET/);
      assert.doesNotMatch(readFileSync(path, "utf8"), /SECRET/);
      assert.equal(statSync(path).mode & 0o777, 0o600);
    }
    assert.equal(statSync(directory).mode & 0o777, 0o700);
  });

  test("interrupted prompt and late stop do not count", async () => {
    await quiet(event("UserPromptSubmit", "interrupted"));
    await quiet(event("UserPromptSubmit", "p1"));
    await quiet(event("Stop", "interrupted"));
    await quiet(event("Stop", "p1"));
    assert.equal(await complete("p2"), "");
    assert.equal(await complete("p3"), "");
    assert.equal(state().issued, true);
  });

  test("stop requires matching submission", async () => {
    await quiet(event("Stop", "unregistered"));
    assert.equal(existsSync(statePath()), false);
    await quiet(event("UserPromptSubmit", "p1"));
    await quiet(event("Stop", "different"));
    assert.deepEqual(state().completed_prompt_ids, []);
  });

  test("ignored events do not touch state", async () => {
    await complete("p1");
    const original = readFileSync(statePath());
    for (const name of ["UserPromptSubmit", "Stop"]) {
      for (const field of ["session_id", "prompt_id"]) {
        for (const value of [null, ""]) {
          await quiet(event(name, "ignored", "session", { [field]: value }));
        }
        const missing = event(name, "ignored");
        delete missing[field];
        await quiet(missing);
      }
      await quiet(event(name, "ignored", "session", { agent_id: "subagent" }));
      await quiet(
        event(name, "ignored", "session", { stop_hook_active: true }),
      );
    }
    for (const name of ["SubagentStop", "SessionEnd", "StopFailure"]) {
      await quiet(event(name, "ignored"));
    }
    assert.deepEqual(readFileSync(statePath()), original);
  });

  test("eight concurrent duplicate stops spawn the reviewer once", async () => {
    await complete("p1");
    await complete("p2");
    await quiet(event("UserPromptSubmit", "p3"));
    const before = names();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => invoke(event("Stop", "p3"))),
    );
    for (const result of results) {
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout, "");
      assert.doesNotMatch(result.stderr, /SECRET/);
    }
    await waitForNew(
      (name) => name.endsWith(".report.md") || name.endsWith(".failed.md"),
      before,
    );
    const spawned = readdirSync(directory).filter(
      (name) =>
        (name.endsWith(".report.md") || name.endsWith(".failed.md")) &&
        !before.has(name),
    );
    assert.equal(spawned.length, 1);
    await quiet(event("Stop", "p3"));
  });

  test("native flock contention fails closed and retry recovers", async () => {
    await complete("p1");
    await complete("p2");
    await quiet(event("UserPromptSubmit", "p3"));
    const before = readFileSync(statePath());
    const libc = koffi.load(LIBC);
    const flock = libc.func("int flock(int fd, int operation)");
    const fd = openSync(lockPath(), "a", 0o600);
    try {
      assert.equal(flock(fd, 2 | 4), 0);
      // A separate asynchronous process must contend with this descriptor.
      failedClosed(await invoke(event("Stop", "p3")));
      assert.deepEqual(readFileSync(statePath()), before);
    } finally {
      closeSync(fd);
      libc.unload();
    }
    const retry = await invoke(event("Stop", "p3"));
    assert.equal(retry.stdout, "");
    assert.equal(retry.exitCode, 0);
    assert.equal(state().issued, true);
  });

  test("process death releases a native flock and retry recovers", async () => {
    await complete("p1");
    await complete("p2");
    await quiet(event("UserPromptSubmit", "p3"));
    const before = readFileSync(statePath());
    const lockBefore = statSync(lockPath(), { bigint: true });
    const child = spawn(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `
      import koffi from ${JSON.stringify(import.meta.resolve("koffi"))};
      import { openSync, writeSync } from "node:fs";
      const libc = koffi.load(${JSON.stringify(LIBC)});
      const flock = libc.func("int flock(int fd, int operation)");
      const fd = openSync(${JSON.stringify(lockPath())}, "a", 0o600);
      if (flock(fd, 2 | 4) !== 0) process.exit(1);
      writeSync(1, "locked\\n");
      setInterval(() => {}, 1000);
    `,
      ],
      {
        env,
        cwd: home,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 5000,
        killSignal: "SIGKILL",
      },
    );
    const exited = once(child, "close");
    const reader = child.stdout[Symbol.asyncIterator]();
    const stderr = text(child.stderr);
    try {
      const ready = await reader.next();
      assert.equal(ready.done, false);
      assert.equal(ready.value.toString(), "locked\n");
      failedClosed(await invoke(event("Stop", "p3")));
      assert.deepEqual(readFileSync(statePath()), before);
    } finally {
      child.kill("SIGKILL");
      await exited;
      await reader.return?.();
    }
    assert.equal(child.signalCode, "SIGKILL");
    assert.equal(await stderr, "");
    assert.equal(statSync(lockPath(), { bigint: true }).ino, lockBefore.ino);
    const retry = await invoke(event("Stop", "p3"));
    assert.equal(retry.stdout, "");
    assert.equal(retry.exitCode, 0);
    assert.equal(state().issued, true);
    await quiet(event("Stop", "p3"));
  });

  test("old Python JSON state and existing lock resume without a reset", async () => {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const oldState = {
      current_prompt_id: hash("p3"),
      completed_prompt_ids: [hash("p1"), hash("p2")],
      issued: false,
    };
    writeFileSync(statePath(), JSON.stringify(oldState), { mode: 0o600 });
    writeFileSync(lockPath(), "", { mode: 0o600 });
    const lockBefore = statSync(lockPath(), { bigint: true });
    const result = await invoke(event("Stop", "p3"));
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "");
    assert.deepEqual(state(), {
      current_prompt_id: null,
      completed_prompt_ids: [hash("p1"), hash("p2"), hash("p3")],
      issued: true,
    });
    assert.equal(statSync(lockPath(), { bigint: true }).ino, lockBefore.ino);
    const issued = readFileSync(statePath());
    assert.equal(await complete("p4"), "");
    assert.deepEqual(readFileSync(statePath()), issued);
  });

  test("malformed input has no output or sensitive diagnostic", async () => {
    for (const payload of ["{SECRET", "[]", "null", "42"]) {
      failedClosed(await invoke(payload));
    }
    for (const fields of [
      { session_id: ["SECRET"] },
      { prompt_id: 42 },
      { stop_hook_active: "SECRET" },
    ]) {
      failedClosed(await invoke(event("Stop", "p1", "session", fields)));
    }
    assert.equal(existsSync(directory), false);
  });

  test("missing native dependency has a safe diagnostic and exits zero", async () => {
    await complete("p1");
    await complete("p2");
    await quiet(event("UserPromptSubmit", "p3"));
    const before = readFileSync(statePath());
    // Copy rather than link so Node cannot resolve the installed dependency.
    const isolatedHook = join(home, "auto-improve.ts");
    copyFileSync(HOOK, isolatedHook);
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await invoke(
        event("Stop", "p3", "session", { prompt: "SECRET" }),
        [process.execPath, isolatedHook],
      );
      failedClosed(result);
      assert.equal(result.stderr, "auto-improve: state failed; no review.\n");
      assert.deepEqual(readFileSync(statePath()), before);
    }
    const retry = await invoke(event("Stop", "p3"));
    assert.equal(retry.stdout, "");
    assert.equal(retry.exitCode, 0);
    assert.equal(state().issued, true);
    await quiet(event("Stop", "p3"));
  });

  test("corrupt committed state is never reset", async () => {
    await complete("p1");
    await complete("p2");
    assert.equal(await complete("p3"), "");
    const issued = state();
    for (const payload of [
      "{SECRET",
      "{}",
      "[]",
      "null",
      JSON.stringify({ ...issued, issued: false }),
      JSON.stringify({ ...issued, issued: "SECRET" }),
      JSON.stringify({ ...issued, completed_prompt_ids: [{}] }),
      JSON.stringify({
        ...issued,
        completed_prompt_ids: Array(3).fill("0".repeat(64)),
      }),
    ]) {
      writeFileSync(statePath(), payload);
      for (const name of ["UserPromptSubmit", "Stop"]) {
        failedClosed(await invoke(event(name, "p4")));
      }
      assert.equal(readFileSync(statePath(), "utf8"), payload);
    }
  });

  test("partial temporary write keeps committed state", async () => {
    await complete("p1");
    await complete("p2");
    const orphan = join(directory, `${hash("session")}.partial.tmp`);
    writeFileSync(orphan, '{"issued":');
    assert.equal(await complete("p3"), "");
    assert.equal(state().issued, true);
    assert.equal(readFileSync(orphan, "utf8"), '{"issued":');
    await quiet(event("Stop", "p3"));
  });

  test("unavailable state path has no review", async () => {
    writeFileSync(stateRoot, "SECRET not a directory");
    failedClosed(await invoke(event("UserPromptSubmit")));
    failedClosed(await invoke(event("Stop")));
    assert.equal(readFileSync(stateRoot, "utf8"), "SECRET not a directory");
  });

  test(
    "failed state write preserves state and retry recovers",
    { skip: process.geteuid?.() === 0 },
    async () => {
      await complete("p1");
      await complete("p2");
      await quiet(event("UserPromptSubmit", "p3"));
      const before = readFileSync(statePath());
      chmodSync(directory, 0o500);
      try {
        failedClosed(await invoke(event("Stop", "p3")));
        assert.deepEqual(readFileSync(statePath()), before);
      } finally {
        chmodSync(directory, 0o700);
      }
      const retry = await invoke(event("Stop", "p3"));
      assert.equal(retry.stdout, "");
      assert.equal(retry.exitCode, 0);
      assert.equal(state().issued, true);
      await quiet(event("Stop", "p3"));
    },
  );

  test("dangling state link is not treated as a new session", async () => {
    mkdirSync(directory, { recursive: true });
    const missing = join(home, "missing");
    symlinkSync(missing, statePath());
    failedClosed(await invoke(event("UserPromptSubmit")));
    assert.equal(lstatSync(statePath()).isSymbolicLink(), true);
    assert.equal(existsSync(missing), false);
  });

  test("HOME state fallback", async () => {
    delete env.XDG_STATE_HOME;
    await quiet(event("UserPromptSubmit"));
    env.XDG_STATE_HOME = "";
    await quiet(event("UserPromptSubmit"));
    const fallback = join(
      home,
      ".local/state/auto-improve/claude",
      basename(statePath()),
    );
    assert.equal(existsSync(fallback), true);
    assert.equal(existsSync(directory), false);
  });

  test("install is repeatable and preserves Puppet dcg", async () => {
    const dcg = join(hookDirectory, "dcg");
    writeFileSync(dcg, "Puppet-managed wrapper");
    assert.equal((await installHook()).exitCode, 0);
    const before = lstatSync(installedHook, { bigint: true });
    assert.equal(readlinkSync(installedHook), HOOK);
    assert.equal((await installHook()).exitCode, 0);
    const after = lstatSync(installedHook, { bigint: true });
    assert.equal(after.ino, before.ino);
    assert.equal(after.mtimeNs, before.mtimeNs);
    assert.equal(readFileSync(dcg, "utf8"), "Puppet-managed wrapper");
    assert.equal(lstatSync(dcg).isSymbolicLink(), false);
    assert.deepEqual(
      readFileSync(join(home, "npm-args"), "utf8").trimEnd().split("\n"),
      [...NPM_ARGS, ...NPM_ARGS],
    );
  });

  test("npm failure preserves the managed old link until retry succeeds", async () => {
    const oldDestination = join(hookDirectory, "auto-improve.py");
    symlinkSync(OLD_HOOK, oldDestination);
    const before = lstatSync(oldDestination, { bigint: true });
    env.NPM_TEST_EXIT_CODE = "42";
    for (let attempt = 0; attempt < 2; attempt++) {
      assert.equal((await installHook()).exitCode, 42);
      assert.equal(
        lstatSync(installedHook, { throwIfNoEntry: false }),
        undefined,
      );
      assert.equal(readlinkSync(oldDestination), OLD_HOOK);
      assert.equal(lstatSync(oldDestination, { bigint: true }).ino, before.ino);
    }
    env.NPM_TEST_EXIT_CODE = "0";
    assert.equal((await installHook()).exitCode, 0);
    assert.equal(readlinkSync(installedHook), HOOK);
    assert.equal(
      lstatSync(oldDestination, { throwIfNoEntry: false }),
      undefined,
    );
    assert.deepEqual(
      readFileSync(join(home, "npm-args"), "utf8").trimEnd().split("\n"),
      [...NPM_ARGS, ...NPM_ARGS, ...NPM_ARGS],
    );
  });

  test("install preserves unexpected destinations", async () => {
    writeFileSync(installedHook, "existing hook");
    const result = await installHook();
    assert.equal(result.exitCode, 73);
    assert.match(
      result.stderr,
      /Cannot replace existing Claude auto-improve hook/,
    );
    assert.equal(readFileSync(installedHook, "utf8"), "existing hook");
    unlinkSync(installedHook);
    symlinkSync(join(home, "missing"), installedHook);
    assert.equal((await installHook()).exitCode, 73);
    assert.equal(readlinkSync(installedHook), join(home, "missing"));
    unlinkSync(installedHook);
    mkdirSync(installedHook);
    assert.equal((await installHook()).exitCode, 73);
    assert.deepEqual(readdirSync(installedHook), []);
  });

  test("install removes only the managed Python link after TypeScript link success", async () => {
    const oldDestination = join(hookDirectory, "auto-improve.py");
    symlinkSync(OLD_HOOK, oldDestination);
    writeFileSync(installedHook, "existing hook");
    assert.equal((await installHook()).exitCode, 73);
    assert.equal(readlinkSync(oldDestination), OLD_HOOK);
    assert.equal(readFileSync(installedHook, "utf8"), "existing hook");
    unlinkSync(installedHook);
    assert.equal((await installHook()).exitCode, 0);
    assert.equal(readlinkSync(installedHook), HOOK);
    assert.ok(!readdirSync(hookDirectory).includes("auto-improve.py"));
    const before = lstatSync(installedHook, { bigint: true });
    assert.equal((await installHook()).exitCode, 0);
    assert.equal(lstatSync(installedHook, { bigint: true }).ino, before.ino);
  });

  test("install preserves unrelated old Python hooks", async () => {
    const oldDestination = join(hookDirectory, "auto-improve.py");
    writeFileSync(oldDestination, "unmanaged old hook");
    assert.equal((await installHook()).exitCode, 0);
    assert.equal(readFileSync(oldDestination, "utf8"), "unmanaged old hook");
    assert.equal(lstatSync(oldDestination).isSymbolicLink(), false);
    unlinkSync(oldDestination);
    const unrelated = join(home, "unrelated-hook.py");
    symlinkSync(unrelated, oldDestination);
    assert.equal((await installHook()).exitCode, 0);
    assert.equal(readlinkSync(oldDestination), unrelated);
    unlinkSync(oldDestination);
    mkdirSync(oldDestination);
    assert.equal((await installHook()).exitCode, 0);
    assert.deepEqual(readdirSync(oldDestination), []);
    assert.equal(readlinkSync(installedHook), HOOK);
  });

  test("settings commands do not block when the script is missing", async () => {
    for (const name of ["UserPromptSubmit", "Stop"]) {
      const result = await invokeSettings(name);
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /Cannot find module/);
      assert.match(result.stderr, /auto-improve\.ts/);
    }
    assert.equal(existsSync(directory), false);
  });

  test("settings commands do not block when node is missing or stdin closes early", async () => {
    writeFileSync(
      installedHook,
      'process.stdout.write("unexpected review");\n',
    );
    env.PATH = join(home, "bin");
    for (const name of ["UserPromptSubmit", "Stop"]) {
      const result = await invokeSettings(
        name,
        event(name, "p1", "session", { prompt: "x".repeat(1024 * 1024) }),
      );
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /node: (command )?not found/);
    }
    assert.equal(existsSync(directory), false);
  });

  for (const { failure, source, diagnostic } of [
    {
      failure: "a syntax error",
      source: "const broken = ;\n",
      diagnostic: /SyntaxError/,
    },
    {
      failure: "exit code 2",
      source:
        'import { writeSync } from "node:fs";\nwriteSync(2, "hook exit 2\\n");\nprocess.exit(2);\n',
      diagnostic: /hook exit 2/,
    },
    {
      failure: "SIGKILL",
      source:
        'import { writeSync } from "node:fs";\nwriteSync(2, "hook before SIGKILL\\n");\nprocess.kill(process.pid, "SIGKILL");\n',
      diagnostic: /hook before SIGKILL/,
    },
  ]) {
    test(`settings commands do not block after ${failure}`, async () => {
      writeFileSync(installedHook, source);
      for (const name of ["UserPromptSubmit", "Stop"]) {
        const result = await invokeSettings(name);
        assert.equal(result.exitCode, 0);
        assert.equal(result.stdout, "");
        assert.match(result.stderr, diagnostic);
      }
      assert.equal(existsSync(directory), false);
    });
  }

  test("settings commands preserve diagnostics when the state path fails", async () => {
    assert.equal((await installHook()).exitCode, 0);
    writeFileSync(stateRoot, "SECRET not a directory");
    for (const name of ["UserPromptSubmit", "Stop"]) {
      const result = await invokeSettings(name);
      failedClosed(result);
      assert.equal(result.stderr, "auto-improve: state failed; no review.\n");
    }
    assert.equal(readFileSync(stateRoot, "utf8"), "SECRET not a directory");
  });

  test("settings commands preserve diagnostics when the native dependency is missing", async () => {
    copyFileSync(HOOK, installedHook);
    for (const name of ["UserPromptSubmit", "Stop"]) {
      const result = await invokeSettings(name);
      failedClosed(result);
      assert.equal(result.stderr, "auto-improve: state failed; no review.\n");
    }
    assert.equal(existsSync(statePath()), false);
  });

  test("settings commands deliver review through installed link", async () => {
    rmSync(hookDirectory, { recursive: true });
    assert.equal((await installHook()).exitCode, 0);
    const { hooks } = JSON.parse(
      readFileSync(join(ROOT, "terminal/claude/settings.json"), "utf8"),
    );
    assert.deepEqual(hooks.PreToolUse, [
      {
        matcher: "Bash",
        hooks: [{ type: "command", command: "~/.claude/hooks/dcg" }],
      },
    ]);
    for (const prompt of ["p1", "p2", "p3"]) {
      for (const name of ["UserPromptSubmit", "Stop"]) {
        const result = await invokeSettings(name, event(name, prompt));
        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(result.stdout, "");
      }
    }
    assert.equal(state().issued, true);
  });

  test("issued review spawns a detached headless reviewer", async () => {
    const argvLog = join(home, "claude-argv.log");
    writeFileSync(
      join(bin, "claude"),
      `#!/bin/sh
for arg in "$@"; do
  printf '%s\n' "$arg" >> "$FAKE_CLAUDE_ARGV_LOG"
done
printf '%s\n' "---ENV---" >> "$FAKE_CLAUDE_ARGV_LOG"
printf 'AUTO_IMPROVE_REVIEWER=%s\n' "$AUTO_IMPROVE_REVIEWER" >> "$FAKE_CLAUDE_ARGV_LOG"
printf 'cwd=%s\n' "$(pwd)" >> "$FAKE_CLAUDE_ARGV_LOG"
printf 'PROPOSALS'
`,
      { mode: 0o700 },
    );
    env.FAKE_CLAUDE_ARGV_LOG = argvLog;
    delete env.DOTFILES_PATH;
    const reviewerCwd = join(home, "project");
    mkdirSync(reviewerCwd);

    await complete("p1");
    await complete("p2");
    await quiet(event("UserPromptSubmit", "p3"));
    const before = names();
    const result = await invoke(
      event("Stop", "p3", "session", {
        cwd: reviewerCwd,
        transcript_path: "/transcripts/session.jsonl",
      }),
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");

    const reportName = await waitForNew(
      (name) => name.endsWith(".report.md"),
      before,
    );
    const uuid = reportName.slice(0, -".report.md".length);
    const report = readFileSync(join(directory, reportName), "utf8");
    const lines = report.split("\n");
    assert.equal(lines[0], "# auto-improve report");
    assert.equal(lines[1], `source_session: ${hash("session")}`);
    assert.equal(lines[2], `cwd: ${reviewerCwd}`);
    assert.equal(lines[3], "transcript: /transcripts/session.jsonl");
    assert.equal(lines[4], `resume: claude --resume ${uuid}`);
    assert.match(lines[5], /^date: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    assert.equal(lines[6], "");
    assert.ok(report.endsWith("PROPOSALS"), report);

    const log = readFileSync(argvLog, "utf8").split("\n");
    const envIndex = log.indexOf("---ENV---");
    const argv = log.slice(0, envIndex);
    assert.equal(argv[0], "-p");
    assert.match(argv[1], /transcripts\/session\.jsonl/);
    assert.ok(argv[1].includes(reviewerCwd), argv[1]);
    assert.equal(argv[2], "--session-id");
    assert.equal(argv[3], uuid);
    assert.equal(argv[4], "--permission-mode");
    assert.equal(argv[5], "plan");
    assert.equal(argv.length, 6);
    const envLines = log.slice(envIndex + 1);
    assert.ok(envLines.includes("AUTO_IMPROVE_REVIEWER=1"));
    // The child's own shell reports getcwd(3)'s resolved path, which can
    // differ textually from reviewerCwd when a tmp dir is reached via a
    // symlink (e.g. macOS /tmp -> /private/tmp).
    assert.ok(envLines.includes(`cwd=${realpathSync(reviewerCwd)}`));

    const after = readdirSync(directory);
    assert.ok(!after.some((name) => name.endsWith(".tmp")));
    assert.ok(!after.some((name) => name.endsWith(".err")));
  });

  test("DOTFILES_PATH controls --add-dir", async () => {
    const argvLog = join(home, "claude-argv.log");
    writeFileSync(
      join(bin, "claude"),
      `#!/bin/sh
for arg in "$@"; do
  printf '%s\n' "$arg" >> "$FAKE_CLAUDE_ARGV_LOG"
done
printf 'PROPOSALS'
`,
      { mode: 0o700 },
    );
    env.FAKE_CLAUDE_ARGV_LOG = argvLog;

    env.DOTFILES_PATH = "/repo/setup";
    await complete("p1", "with-dotfiles");
    await complete("p2", "with-dotfiles");
    await quiet(event("UserPromptSubmit", "p3", "with-dotfiles"));
    let before = names();
    await invoke(event("Stop", "p3", "with-dotfiles"));
    await waitForNew((name) => name.endsWith(".report.md"), before);
    let argv = readFileSync(argvLog, "utf8").split("\n");
    assert.ok(argv.includes("--add-dir"));
    assert.ok(argv.includes("/repo/setup"));

    rmSync(argvLog);
    delete env.DOTFILES_PATH;
    await complete("p1", "without-dotfiles");
    await complete("p2", "without-dotfiles");
    await quiet(event("UserPromptSubmit", "p3", "without-dotfiles"));
    before = names();
    await invoke(event("Stop", "p3", "without-dotfiles"));
    await waitForNew((name) => name.endsWith(".report.md"), before);
    argv = readFileSync(argvLog, "utf8").split("\n");
    assert.ok(!argv.includes("--add-dir"));
  });

  test("failing reviewer leaves a failed report and no tmp or err", async () => {
    writeFileSync(
      join(bin, "claude"),
      `#!/bin/sh
printf 'boom' >&2
exit 1
`,
      { mode: 0o700 },
    );
    await complete("p1");
    await complete("p2");
    await quiet(event("UserPromptSubmit", "p3"));
    const before = names();
    await invoke(event("Stop", "p3"));
    const failedName = await waitForNew(
      (name) => name.endsWith(".failed.md"),
      before,
    );
    assert.match(readFileSync(join(directory, failedName), "utf8"), /boom/);
    const after = readdirSync(directory);
    assert.ok(
      !after.some((name) => name.endsWith(".report.md") && !before.has(name)),
    );
    assert.ok(!after.some((name) => name.endsWith(".tmp")));
    assert.ok(!after.some((name) => name.endsWith(".err")));
  });

  test("reviewer guard silences the hook inside a headless review", async () => {
    env.AUTO_IMPROVE_REVIEWER = "1";
    await quiet(event("UserPromptSubmit", "p1"));
    assert.equal(existsSync(directory), false);
  });
});
