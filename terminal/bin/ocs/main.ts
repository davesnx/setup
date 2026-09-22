import { createCliRenderer } from "@opentui/core";
import { mountPicker, type Session } from "./picker.ts";
import { listSessions, resumeSession } from "./sessions.ts";
import { theme } from "./theme.ts";

const help = `Usage: ocs

Select an OpenCode V2 session and open it in its working directory.

Type                 Search session titles
Up / Ctrl+P          Previous session
Down / Ctrl+N        Next session
Page Up / Page Down  Move ten sessions
Home / End           First / last session
Ctrl+A               All projects / current directory
Enter                Open the selected session
Esc                  Cancel
Ctrl+C               Clear search, then cancel
`;

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    process.stdout.write(help);
    return 0;
  }
  if (args.length) {
    process.stderr.write(help);
    return 2;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Run ocs in an interactive terminal.");
  }
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    backgroundColor: theme.background,
    useMouse: true,
    screenMode: "alternate-screen",
  });
  let cleanup: (() => void) | undefined;
  let selected: Session | undefined;
  try {
    selected = await new Promise<Session | undefined>((resolve) => {
      cleanup = mountPicker(renderer, {
        load: (query, allProjects, signal) =>
          listSessions(query, allProjects ? undefined : process.cwd(), signal),
        select: resolve,
        cancel: () => resolve(undefined),
      });
    });
  } finally {
    cleanup?.();
    renderer.destroy();
  }
  return selected ? resumeSession(selected) : 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(
    `ocs: ${error instanceof Error ? error.message : "Could not open sessions"}`,
  );
  process.exitCode = 1;
}
