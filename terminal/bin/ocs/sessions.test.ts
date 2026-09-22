import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listSessions, resumeSession, type Session } from "./sessions.ts";

const originalPath = process.env.PATH;
let directory: string;
let capture: string;
const session: Session = {
  id: "ses_id with spaces; $(false)",
  title: "A session",
  directory: "/projects/directory with spaces; $(false)",
  updated: 1_790_021_992_562,
};
const info = {
  id: session.id,
  title: session.title,
  location: { directory: session.directory },
  time: { updated: session.updated },
};

type FakeResponse = {
  output?: string;
  exit?: number;
  wait?: boolean;
  signal?: string;
};

async function fake(options: FakeResponse & { location?: FakeResponse } = {}) {
  const command = join(directory, "opencode");
  await writeFile(
    command,
    `#!${process.execPath}
import { appendFileSync, writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(capture)}, JSON.stringify(process.argv.slice(2)));
appendFileSync(${JSON.stringify(`${capture}.log`)}, JSON.stringify(process.argv.slice(2)) + "\\n");
const config = ${JSON.stringify(options)};
const options = process.argv[4]?.startsWith("/api/location?") ? config.location ?? config : config;
if (options.wait) setInterval(() => {}, 1000);
else if (options.signal) process.kill(process.pid, options.signal);
else {
  process.stdout.write(options.output ?? "");
  if (options.exit && process.argv[2] === "api") process.stderr.write("secret credential must not leak");
  process.exit(options.exit ?? 0);
}
`,
  );
  await chmod(command, 0o755);
}

async function args(): Promise<unknown> {
  return JSON.parse(await readFile(capture, "utf8"));
}

async function calls(): Promise<unknown[]> {
  return (await readFile(`${capture}.log`, "utf8"))
    .trim()
    .split("\n")
    .map((line): unknown => JSON.parse(line));
}

function locationOutput(
  resolvedDirectory: string,
  projectDirectory: string,
  projectID = "project-id",
): string {
  return JSON.stringify({
    directory: resolvedDirectory,
    project: { id: projectID, directory: projectDirectory },
  });
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "ocs-sessions-"));
  capture = join(directory, "args.json");
  process.env.PATH = directory;
});

afterEach(async () => {
  if (originalPath === undefined) delete process.env.PATH;
  else process.env.PATH = originalPath;
  await rm(directory, { recursive: true, force: true });
});

describe("listSessions", () => {
  test("maps V2 session fields and requests root sessions across projects", async () => {
    await fake({
      output: JSON.stringify({ data: [info], cursor: { next: "ignored" } }),
    });
    expect(await listSessions("")).toEqual([session]);
    expect(await args()).toEqual([
      "api",
      "get",
      "/api/session?parentID=null&order=desc&limit=50",
    ]);
  });

  test("encodes search and location input and filters global projects by resolved directory", async () => {
    await fake({
      output: '{"data":[]}',
      location: { output: locationOutput("/a b/&?#é", "/", "global") },
    });
    expect(await listSessions("a & b/#?=é $(false)", "./a b/&?#é")).toEqual([]);
    expect(await calls()).toEqual([
      [
        "api",
        "get",
        "/api/location?location%5Bdirectory%5D=.%2Fa+b%2F%26%3F%23%C3%A9",
      ],
      [
        "api",
        "get",
        "/api/session?parentID=null&order=desc&limit=50&search=a+%26+b%2F%23%3F%3D%C3%A9+%24%28false%29&directory=%2Fa+b%2F%26%3F%23%C3%A9",
      ],
    ]);
  });

  test("filters project sessions by project ID and normalized relative subpath", async () => {
    await fake({
      output: '{"data":[]}',
      location: {
        output: locationOutput(
          "/repo/packages/a\\b & c",
          "/repo",
          "project & id",
        ),
      },
    });
    expect(await listSessions("", directory)).toEqual([]);
    expect(await args()).toEqual([
      "api",
      "get",
      "/api/session?parentID=null&order=desc&limit=50&project=project+%26+id&subpath=packages%2Fa%2Fb+%26+c",
    ]);
  });

  test("keeps the empty root subpath and caches successful locations per input directory", async () => {
    await fake({
      output: '{"data":[]}',
      location: { output: locationOutput("/repo", "/repo") },
    });
    await listSessions("first", directory);
    await listSessions("second", directory);
    await listSessions("third", join(directory, "other"));
    const firstLocation = `/api/location?${new URLSearchParams({ "location[directory]": directory })}`;
    const secondLocation = `/api/location?${new URLSearchParams({ "location[directory]": join(directory, "other") })}`;
    expect(await calls()).toEqual([
      ["api", "get", firstLocation],
      [
        "api",
        "get",
        "/api/session?parentID=null&order=desc&limit=50&search=first&project=project-id&subpath=",
      ],
      [
        "api",
        "get",
        "/api/session?parentID=null&order=desc&limit=50&search=second&project=project-id&subpath=",
      ],
      ["api", "get", secondLocation],
      [
        "api",
        "get",
        "/api/session?parentID=null&order=desc&limit=50&search=third&project=project-id&subpath=",
      ],
    ]);
  });

  test.each([
    { output: "secret credential", message: "invalid JSON for the location" },
    { output: "null", message: "invalid location" },
    { output: "[]", message: "invalid location" },
    { output: "{}", message: "invalid location" },
    {
      output: '{"directory":"/repo","project":null}',
      message: "invalid location",
    },
    { output: locationOutput("", "/repo"), message: "invalid location" },
    { output: locationOutput("/repo", ""), message: "invalid location" },
    {
      output: locationOutput("/repo", "/repo", ""),
      message: "invalid location",
    },
  ])(
    "rejects invalid locations and permits a later retry: %j",
    async ({ output, message }) => {
      await fake({ location: { output } });
      await expect(listSessions("", directory)).rejects.toThrow(message);
      expect(await calls()).toHaveLength(1);
      await fake({
        output: '{"data":[]}',
        location: { output: locationOutput("/repo", "/repo") },
      });
      expect(await listSessions("", directory)).toEqual([]);
      expect(await calls()).toHaveLength(3);
    },
  );

  test("reports location command failure and permits a later retry", async () => {
    await fake({ location: { output: "secret credential", exit: 7 } });
    await expect(listSessions("", directory)).rejects.toThrow(
      "OpenCode resolve location failed (exit 7).",
    );
    await fake({
      output: '{"data":[]}',
      location: { output: locationOutput("/repo", "/repo") },
    });
    expect(await listSessions("", directory)).toEqual([]);
    expect(await calls()).toHaveLength(3);
  });

  test("uses the ID for an untitled session allowed by the API", async () => {
    await fake({
      output: JSON.stringify({ data: [{ ...info, title: undefined }] }),
    });
    expect(await listSessions("")).toEqual([{ ...session, title: session.id }]);
  });

  test("rejects malformed JSON without exposing the response", async () => {
    await fake({ output: "secret credential" });
    await expect(listSessions("")).rejects.toThrow(
      "OpenCode returned invalid JSON for the session list.",
    );
  });

  test.each(
    [null, [], {}, { data: null }, { data: {} }].map((value) => ({ value })),
  )("rejects invalid envelopes: %j", async ({ value: response }) => {
    await fake({ output: JSON.stringify(response) });
    await expect(listSessions("")).rejects.toThrow("expected a data array");
  });

  test.each(
    [
      null,
      [],
      {},
      { ...info, id: 42 },
      { ...info, id: "" },
      { ...info, id: "secret credential" },
      { ...info, title: null },
      { ...info, title: 42 },
      { ...info, location: null },
      { ...info, location: { directory: 42 } },
      { ...info, location: { directory: "" } },
      { ...info, location: { directory: "a\0b" } },
      { ...info, time: null },
      { ...info, time: {} },
      { ...info, time: { updated: "today" } },
      { ...info, time: { updated: 1e100 } },
    ].map((value) => ({ value })),
  )("rejects invalid session fields: %j", async ({ value }) => {
    await fake({ output: JSON.stringify({ data: [value] }) });
    await expect(listSessions("")).rejects.toThrow(
      "invalid session at index 0",
    );
  });

  test("reports CLI failure without stdout or stderr", async () => {
    await fake({ output: "secret credential", exit: 7 });
    await expect(listSessions("")).rejects.toThrow(
      "OpenCode list sessions failed (exit 7).",
    );
  });

  test("reports a missing executable", async () => {
    await expect(listSessions("")).rejects.toThrow("OpenCode was not found");
  });

  test.each([false, true])(
    "aborts a running request (directory filter: %j)",
    async (filtered) => {
      await fake({ wait: true });
      const controller = new AbortController();
      const request = listSessions(
        "",
        filtered ? directory : undefined,
        controller.signal,
      );
      const result = request.catch((error: unknown) => error);
      try {
        for (let i = 0; i < 100; i++) {
          try {
            await args();
            break;
          } catch {
            await Bun.sleep(10);
          }
        }
        expect(await args()).toEqual([
          "api",
          "get",
          filtered
            ? `/api/location?${new URLSearchParams({ "location[directory]": directory })}`
            : "/api/session?parentID=null&order=desc&limit=50",
        ]);
      } finally {
        controller.abort();
      }
      expect(await result).toMatchObject({ name: "AbortError" });
      if (filtered) {
        await fake({
          output: '{"data":[]}',
          location: { output: locationOutput("/repo", "/repo") },
        });
        expect(await listSessions("", directory)).toEqual([]);
        expect(await calls()).toHaveLength(3);
      }
    },
  );

  test("times out an unresponsive command", async () => {
    await fake({ wait: true });
    await expect(listSessions("")).rejects.toThrow(
      "timed out after 15 seconds",
    );
  }, 20_000);
});

describe("resumeSession", () => {
  test("passes the exact directory and session ID and preserves the exit code", async () => {
    await fake({ exit: 23 });
    expect(await resumeSession(session)).toBe(23);
    expect(await args()).toEqual([session.directory, "--session", session.id]);
  });

  test("returns zero on success", async () => {
    await fake();
    expect(await resumeSession(session)).toBe(0);
  });

  test("maps SIGTERM to shell exit status 143", async () => {
    await fake({ signal: "SIGTERM" });
    expect(await resumeSession(session)).toBe(143);
  });

  test("reports a missing executable", async () => {
    await expect(resumeSession(session)).rejects.toThrow(
      "OpenCode was not found",
    );
  });
});
