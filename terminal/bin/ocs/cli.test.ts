import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const command = resolve(import.meta.dir, "ocs");

test("help works without a terminal and unknown arguments fail", async () => {
  const help = Bun.spawn([command, "--help"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await help.exited).toBe(0);
  expect(await new Response(help.stdout).text()).toContain("Ctrl+A");
  const invalid = Bun.spawn([command, "--invalid"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await invalid.exited).toBe(2);
});

test("non-interactive use fails before starting the picker", async () => {
  const child = Bun.spawn([command], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await child.exited).toBe(1);
  expect(await new Response(child.stderr).text()).toContain(
    "interactive terminal",
  );
});

test.each([false, true])(
  "PTY selection/cancellation restores the terminal (cancel=%s)",
  async (cancel) => {
    const directory = await mkdtemp(join(tmpdir(), "ocs-cli-"));
    let output = "";
    const terminal = new Bun.Terminal({
      cols: 100,
      rows: 32,
      data: (_terminal, bytes) => {
        output += new TextDecoder().decode(bytes);
      },
    });
    let child: ReturnType<typeof Bun.spawn> | undefined;
    try {
      const fixture = join(directory, "fake.ts");
      const result = join(directory, "result.json");
      await writeFile(
        join(directory, "opencode"),
        '#!/bin/sh\nexec "$OCS_TEST_RUNTIME" "$OCS_TEST_FIXTURE" "$@"\n',
        { mode: 0o755 },
      );
      await writeFile(
        fixture,
        `
      import { writeFileSync } from "node:fs";
      import { spawnSync } from "node:child_process";
      const args = process.argv.slice(2);
      if (args[0] === "api") {
        console.log(JSON.stringify({ data: [
          { id: "ses_first", title: "First fixture", location: { directory: "/project one" }, time: { updated: Date.now() } },
          { id: "ses_second", title: "Second fixture", location: { directory: "/project two" }, time: { updated: Date.now() } }
        ], cursor: {} }));
      } else {
        writeFileSync(process.env.OCS_TEST_RESULT, JSON.stringify({
          args,
          tty: !!process.stdin.isTTY && !!process.stdout.isTTY,
          mode: spawnSync("stty", ["-a"], { stdio: ["inherit", "pipe", "inherit"], encoding: "utf8" }).stdout,
        }));
        process.exitCode = 7;
      }
    `,
      );
      child = Bun.spawn([command], {
        terminal,
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          OCS_TEST_RUNTIME: process.execPath,
          OCS_TEST_FIXTURE: fixture,
          OCS_TEST_RESULT: result,
        },
      });
      const deadline = Date.now() + 5000;
      while (!output.includes("Second fixture") && Date.now() < deadline)
        await Bun.sleep(20);
      expect(output).toContain("Second fixture");
      terminal.write(cancel ? "\u001b" : "\u001b[B\r");
      const code = await Promise.race([
        child.exited,
        Bun.sleep(5000).then(() => {
          throw new Error("ocs did not exit");
        }),
      ]);
      expect(code).toBe(cancel ? 0 : 7);
      expect(output).toContain("\u001b[?1049l");
      if (cancel) {
        expect(await Bun.file(result).exists()).toBe(false);
      } else {
        const data = JSON.parse(await readFile(result, "utf8"));
        expect(data.args).toEqual(["/project two", "--session", "ses_second"]);
        expect(data.tty).toBe(true);
        expect(data.mode).not.toMatch(/(?:^|[\s;])-icanon(?:[\s;]|$)/);
        expect(data.mode).not.toMatch(/(?:^|[\s;])-echo(?:[\s;]|$)/);
      }
    } finally {
      if (child && child.exitCode === null) {
        child.kill();
        await child.exited;
      }
      terminal.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
  12000,
);
