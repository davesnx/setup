import { execFile, spawn } from "node:child_process";
import { constants } from "node:os";
import { relative } from "node:path";
import type { Session } from "./picker.ts";

export type { Session } from "./picker.ts";

type Location = {
  directory: string;
  project: { id: string; directory: string };
};

const locations = new Map<string, Location>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function commandError(error: unknown, action: string): Error {
  if (isRecord(error) && error.code === "ENOENT") {
    return new Error("OpenCode was not found. Install it or add it to PATH.");
  }
  if (isRecord(error) && error.code === "ABORT_ERR") {
    const aborted = new Error("Session search was cancelled.");
    aborted.name = "AbortError";
    return aborted;
  }
  if (isRecord(error) && error.killed === true) {
    return new Error("OpenCode session search timed out after 15 seconds.");
  }
  if (isRecord(error) && typeof error.code === "number") {
    return new Error(`OpenCode ${action} failed (exit ${error.code}).`);
  }
  return new Error(
    `Could not ${action} with OpenCode. Check its installation and service.`,
  );
}

async function request(
  path: string,
  action: string,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    execFile(
      "opencode",
      ["api", "get", path],
      {
        encoding: "utf8",
        timeout: 15_000,
        killSignal: "SIGKILL",
        maxBuffer: 4 * 1024 * 1024,
        signal,
      },
      (error, stdout) => {
        if (error) reject(commandError(error, action));
        else resolve(stdout);
      },
    );
  });
}

async function getLocation(
  directory: string,
  signal?: AbortSignal,
): Promise<Location> {
  const cached = locations.get(directory);
  if (cached) return cached;
  const params = new URLSearchParams({ "location[directory]": directory });
  const output = await request(
    `/api/location?${params}`,
    "resolve location",
    signal,
  );
  let value: unknown;
  try {
    value = JSON.parse(output);
  } catch {
    throw new Error("OpenCode returned invalid JSON for the location.");
  }
  if (
    !isRecord(value) ||
    typeof value.directory !== "string" ||
    !value.directory ||
    value.directory.includes("\0") ||
    !isRecord(value.project) ||
    typeof value.project.id !== "string" ||
    !value.project.id ||
    typeof value.project.directory !== "string" ||
    !value.project.directory ||
    value.project.directory.includes("\0")
  ) {
    throw new Error(
      "OpenCode returned an invalid location: expected directory, project.id, and project.directory.",
    );
  }
  const location: Location = {
    directory: value.directory,
    project: { id: value.project.id, directory: value.project.directory },
  };
  locations.set(directory, location);
  return location;
}

function parseSessions(output: string): Session[] {
  let response: unknown;
  try {
    response = JSON.parse(output);
  } catch {
    throw new Error("OpenCode returned invalid JSON for the session list.");
  }
  if (!isRecord(response) || !Array.isArray(response.data)) {
    throw new Error(
      "OpenCode returned an invalid session list: expected a data array.",
    );
  }
  return response.data.map((value: unknown, index: number): Session => {
    const invalid = (field: string) =>
      new Error(
        `OpenCode returned an invalid session at index ${index}: ${field}.`,
      );
    if (!isRecord(value)) throw invalid("expected an object");
    if (
      typeof value.id !== "string" ||
      !value.id.startsWith("ses") ||
      value.id.includes("\0")
    ) {
      throw invalid("id must be a session ID");
    }
    if (value.title !== undefined && typeof value.title !== "string") {
      throw invalid("title must be a string");
    }
    if (
      !isRecord(value.location) ||
      typeof value.location.directory !== "string" ||
      !value.location.directory ||
      value.location.directory.includes("\0")
    ) {
      throw invalid("location.directory must be a nonempty path");
    }
    if (
      !isRecord(value.time) ||
      typeof value.time.updated !== "number" ||
      !Number.isFinite(value.time.updated) ||
      !Number.isFinite(new Date(value.time.updated).getTime())
    ) {
      throw invalid("time.updated must be a valid timestamp");
    }
    return {
      id: value.id,
      // The V2 API permits sessions without a title.
      title: value.title ?? value.id,
      directory: value.location.directory,
      updated: value.time.updated,
    };
  });
}

export async function listSessions(
  query: string,
  directory?: string,
  signal?: AbortSignal,
): Promise<Session[]> {
  const params = new URLSearchParams({
    parentID: "null",
    order: "desc",
    limit: "50",
  });
  if (query) params.set("search", query);
  if (directory !== undefined) {
    const location = await getLocation(directory, signal);
    if (location.project.id === "global") {
      params.set("directory", location.directory);
    } else {
      params.set("project", location.project.id);
      params.set(
        "subpath",
        relative(location.project.directory, location.directory).replaceAll(
          "\\",
          "/",
        ),
      );
    }
  }
  const output = await request(
    `/api/session?${params}`,
    "list sessions",
    signal,
  );
  return parseSessions(output);
}

export async function resumeSession(session: Session): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "opencode",
      [session.directory, "--session", session.id],
      {
        stdio: "inherit",
      },
    );
    child.once("error", (error) =>
      reject(commandError(error, "resume session")),
    );
    child.once("close", (code, signal) => {
      resolve(code ?? (signal ? 128 + constants.signals[signal] : 1));
    });
  });
}
