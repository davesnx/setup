import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const cli = new URL("./docopts.ts", import.meta.url).pathname;
const binRoot = new URL("../../bin/", import.meta.url).pathname;

function run(args: string[], stdin = "") {
  const result = Bun.spawnSync([process.execPath, cli, ...args], { stdin: Buffer.from(stdin) });
  return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() };
}

function shellquote(source: string): string {
  return `'${source.replaceAll("'", "'\\''")}'`;
}

function helpOutput(doc: string): string {
  return `echo -n ${shellquote(`${doc.replace(/^\n+|\n+$/g, "")}\n`)}\nexit 0\n`;
}

const create = "Create a file with all the involved folders\n\nUsage:\n   create <filename>\n";
const effort = "Usage:\n   git-effort [--above <value>] [<path>...]\n";

describe("shell variables", () => {
  test("positional argument", () => {
    expect(run(["-h", create, ":", "foo/bar.txt"])).toEqual({ code: 0, out: "filename='foo/bar.txt'\n", err: "" });
  });

  test("flag, argument, and repeated argument", () => {
    expect(run(["-h", effort, ":", "--above", "5", "a", "b"]).out).toBe("above=true\nvalue='5'\npath=('a' 'b')\n");
    expect(run(["-h", effort, ":"]).out).toBe("above=false\nvalue=\npath=()\n");
  });

  test("option default from the Options section", () => {
    const doc = "Usage:\n  prog [--baud=<n>] <port>\n\nOptions:\n  --baud=<n>  Baudrate [default: 9600]\n";
    expect(run(["-h", doc, ":", "ttyS0"]).out).toBe("baud='9600'\nport='ttyS0'\n");
    expect(run(["-h", doc, ":", "--baud", "115200", "ttyS0"]).out).toBe("baud='115200'\nport='ttyS0'\n");
  });

  test("commands and alternatives", () => {
    const doc = "Usage:\n  prog (add | remove) <x>\n";
    expect(run(["-h", doc, ":", "add", "1"]).out).toBe("add=true\nremove=false\nx='1'\n");
    expect(run(["-h", doc, ":", "remove", "1"]).out).toBe("add=false\nremove=true\nx='1'\n");
  });

  test("repeated flag counts", () => {
    const doc = "Usage:\n  prog [-v...]\n";
    expect(run(["-h", doc, ":", "-v", "-v"]).out).toBe("v=2\n");
    expect(run(["-h", doc, ":"]).out).toBe("v=0\n");
  });

  test("everything after -- is positional", () => {
    const doc = "Usage:\n  prog [<args>...]\n";
    expect(run(["-h", doc, ":", "--", "-x"]).out).toBe("args=('--' '-x')\n");
  });

  test("-O stops option parsing at the first positional", () => {
    const doc = "Usage:\n  prog [-v] [<args>...]\n";
    expect(run(["-h", doc, ":", "a", "-v"]).out).toBe("v=true\nargs=('a')\n");
    expect(run(["-O", "-h", doc, ":", "a", "-v"]).out).toBe("v=false\nargs=('a' '-v')\n");
  });

  test("values with quotes are shell quoted", () => {
    expect(run(["-h", create, ":", "it's"]).out).toBe("filename='it'\\''s'\n");
  });

  test("help text from standard input", () => {
    expect(run(["-h", "-", ":", "x"], create).out).toBe("filename='x'\n");
  });
});

describe("associative array", () => {
  test("-A exports every element, lists as counted keys", () => {
    // Optional elements match independently, so the first positional fills <value>.
    expect(run(["-A", "args", "-h", effort, ":", "a", "b"]).out).toBe(
      "declare -A args\nargs['--above']=false\nargs['<value>']='a'\nargs['<path>,#']=1\nargs['<path>,0']='b'\n",
    );
  });

  test("-A rejects an invalid identifier", () => {
    const result = run(["-A", "1bad", "-h", create, ":", "x"]);
    expect(result.code).toBe(1);
    expect(result.err).toBe("docopts: not a valid Bash identifier: 1bad\n");
  });
});

describe("exits", () => {
  test("--help prints the doc and exits 0", () => {
    expect(run(["-h", create, ":", "--help"]).out).toBe(helpOutput(create));
    expect(run(["-h", create, ":", "-h"]).out).toBe(helpOutput(create));
  });

  test("--version prints the version and exits 0", () => {
    expect(run(["-h", create, "-V", "1.0.0", ":", "--version"]).out).toBe("echo -n '1.0.0\n'\nexit 0\n");
  });

  test("-H leaves --help to the script", () => {
    expect(run(["-H", "-h", "Usage:\n  prog [--help]\n", ":", "--help"]).out).toBe("help=true\n");
  });

  test("wrong arguments print the usage and exit 64", () => {
    const expected = "echo 'Usage:\n   create <filename>' >&2\nexit 64\n";
    expect(run(["-h", create, ":"]).out).toBe(expected);
    expect(run(["-h", create, ":", "a", "b"]).out).toBe(expected);
    expect(run(["-h", create, ":", "--bogus", "a"]).out).toBe(expected);
  });

  test("a missing option argument names the option", () => {
    const doc = "Usage:\n  prog [--baud=<n>]\n";
    expect(run(["-h", doc, ":", "--baud"]).out).toBe("echo '--baud requires argument\nUsage:\n  prog [--baud=<n>]' >&2\nexit 64\n");
  });

  test("a doc without a usage section is the author's error", () => {
    const result = run(["-h", "No usage here", ":"]);
    expect(result.code).toBe(1);
    expect(result.err).toBe('docopts: invalid doc argument: "usage:" (case-insensitive) not found.\n');
  });

  test("elements that mangle to one name are rejected", () => {
    const result = run(["-h", "Usage:\n  prog <a-b> [--a_b]\n", ":", "x"]);
    expect(result.code).toBe(1);
    expect(result.err).toBe("docopts: two or more elements have identically mangled names\n");
  });

  test("docopts prints its own help without a message", () => {
    const result = run(["-h"]);
    expect(result.code).toBe(0);
    expect(result.out.startsWith("Shell interface for docopt")).toBe(true);
  });

  test("docopts without arguments fails with its usage", () => {
    const result = run([]);
    expect(result.code).toBe(1);
    expect(result.err.startsWith("Usage:")).toBe(true);
  });
});

describe("terminal/bin help blocks", () => {
  const scripts: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (readFileSync(path, "utf8").includes("\n##?")) scripts.push(path);
    }
  };
  walk(binRoot);

  test("every script has a help block", () => {
    expect(scripts.length).toBeGreaterThan(20);
  });

  test("every script parses its arguments through docs::parse", () => {
    const missing = scripts.filter((script) => !readFileSync(script, "utf8").includes("docs::parse"));
    expect(missing.map((script) => script.slice(binRoot.length))).toEqual([]);
  });

  for (const script of scripts) {
    test(`${script.slice(binRoot.length)} --help`, () => {
      const doc = readFileSync(script, "utf8")
        .split("\n")
        .filter((line) => line.startsWith("##?"))
        .map((line) => line.slice(4))
        .join("\n");
      expect(run(["-h", doc, ":", "--help"])).toEqual({ code: 0, out: helpOutput(doc), err: "" });
    });
  }
});
