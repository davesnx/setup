#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

const REVIEW =
  "Automatic, one-per-session auto-improve checkpoint. Do not run the review in " +
  "this conversation. Start it as a background fork with the Agent tool " +
  "(subagent_type fork), then end the turn so the user can keep working. The " +
  "fork loads the auto-improve skill, inspects the current session and relevant " +
  "setup files read-only, does the work itself without further subagents, and " +
  "returns at most 3 concrete, evidence-backed proposals for skills, hooks, " +
  "scripts, or rules, or reports that none is useful. Make no setup or code " +
  "edits, commits, or external calls to publish. When the fork result arrives, " +
  "relay the proposals in a short list and ask which to apply, or finish " +
  "quietly. Do not issue another automatic review in this session.";

type State = {
  current_prompt_id: string | null;
  completed_prompt_ids: string[];
  issued: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFalsy(value: unknown): boolean {
  // Python also treats empty lists and dictionaries as missing IDs.
  return (
    !value ||
    (Array.isArray(value) && value.length === 0) ||
    (isRecord(value) && Object.keys(value).length === 0)
  );
}

function isDigest(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === 64 &&
    /^[0-9a-f]{64}$/.test(value)
  );
}

function parseState(value: unknown): State {
  if (!isRecord(value) || Object.keys(value).length !== 3) {
    throw new Error("invalid state");
  }
  const current = value.current_prompt_id;
  const completed = value.completed_prompt_ids;
  const issued = value.issued;
  if (
    (current !== null && !isDigest(current)) ||
    !Array.isArray(completed) ||
    completed.length > 3 ||
    !completed.every(isDigest) ||
    typeof issued !== "boolean" ||
    issued !== (completed.length === 3) ||
    (issued && current !== null)
  ) {
    throw new Error("invalid state");
  }
  const ids = current === null ? completed : [...completed, current];
  if (new Set(ids).size !== ids.length) throw new Error("invalid state");
  return {
    current_prompt_id: current,
    completed_prompt_ids: completed,
    issued,
  };
}

async function main() {
  let phase = "input";
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    const event: unknown = JSON.parse(decoder.decode(readFileSync(0)));
    if (!isRecord(event)) throw new Error("invalid event");
    const name = event.hook_event_name;
    if ((name !== "UserPromptSubmit" && name !== "Stop") || "agent_id" in event)
      return;
    const sessionId = event.session_id;
    const promptId = event.prompt_id;
    if (isFalsy(sessionId) || isFalsy(promptId)) return;
    if (typeof sessionId !== "string" || typeof promptId !== "string") {
      throw new Error("invalid IDs");
    }
    const active = "stop_hook_active" in event ? event.stop_hook_active : false;
    if (typeof active !== "boolean")
      throw new Error("invalid continuation flag");
    if (active) return;

    phase = "state";
    process.umask(0o077);
    const root = process.env.XDG_STATE_HOME || join(homedir(), ".local/state");
    if (!isAbsolute(root)) throw new Error("state root must be absolute");
    const directory = join(root, "auto-improve/claude");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (!sessionId.isWellFormed() || !promptId.isWellFormed()) {
      throw new Error("invalid ID encoding");
    }
    const sessionKey = createHash("sha256").update(sessionId).digest("hex");
    const promptKey = createHash("sha256").update(promptId).digest("hex");
    const statePath = join(directory, sessionKey + ".json");
    const { default: koffi } = await import("koffi");
    const native = koffi.load(
      process.platform === "darwin"
        ? "/usr/lib/libSystem.B.dylib"
        : "libc.so.6",
    );
    const flock = native.func("int flock(int fd, int operation)");
    const lock = openSync(join(directory, sessionKey + ".lock"), "a", 0o600);
    try {
      // LOCK_EX | LOCK_NB on macOS and glibc; closing the descriptor releases it.
      if (flock(lock, 2 | 4) !== 0) throw new Error("lock unavailable");
      let state: State;
      if (lstatSync(statePath, { throwIfNoEntry: false })) {
        state = parseState(JSON.parse(decoder.decode(readFileSync(statePath))));
      } else {
        if (name === "Stop") return;
        state = {
          current_prompt_id: null,
          completed_prompt_ids: [],
          issued: false,
        };
      }
      if (state.issued || state.completed_prompt_ids.includes(promptKey))
        return;
      if (name === "UserPromptSubmit") {
        if (state.current_prompt_id === promptKey) return;
        state.current_prompt_id = promptKey;
      } else {
        if (state.current_prompt_id !== promptKey) return;
        state.current_prompt_id = null;
        state.completed_prompt_ids.push(promptKey);
        state.issued = state.completed_prompt_ids.length === 3;
      }

      const temporary = join(
        directory,
        `${sessionKey}.${randomBytes(16).toString("hex")}.tmp`,
      );
      const target = openSync(temporary, "wx", 0o600);
      try {
        try {
          writeFileSync(target, JSON.stringify(state));
          fsyncSync(target);
        } finally {
          closeSync(target);
        }
        renameSync(temporary, statePath);
        const directoryFd = openSync(directory, "r");
        try {
          fsyncSync(directoryFd);
        } finally {
          closeSync(directoryFd);
        }
      } finally {
        rmSync(temporary, { force: true });
      }

      // Persist first: a crash before output may skip a review, never repeat it.
      if (state.issued) {
        phase = "output";
        writeSync(
          1,
          JSON.stringify({
            hookSpecificOutput: {
              hookEventName: "Stop",
              additionalContext: REVIEW,
            },
          }) + "\n",
        );
      }
    } finally {
      closeSync(lock);
    }
  } catch {
    try {
      writeSync(2, `auto-improve: ${phase} failed; no review.\n`);
    } catch {
      // A closed diagnostic stream must not turn a hook failure into a nonzero exit.
    }
  }
}

await main();
