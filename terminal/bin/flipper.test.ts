import { expect, test } from "bun:test";
import { discoverPort, isSerialTerminal, parseArgs, stripAnsi } from "./flipper.ts";

test.each(["help", "port", "info", "release"])("parses %s with defaults", (command) => {
  expect(parseArgs([command])).toEqual({ command, timeout: 5000, idle: 800, raw: false, json: false });
});

test.each(["send", "exec", "run"])("%s preserves complete CLI lines and their order", (command) => {
  expect(parseArgs([command, "nfc", "dump /ext/nfc/My Card.nfc"]).command).toBe("send");
  expect(parseArgs([command, "nfc", "dump /ext/nfc/My Card.nfc"])).toMatchObject({
    lines: ["nfc", "dump /ext/nfc/My Card.nfc"],
  });
});

test.each(["ls", "storage"])("%s defaults to /ext and accepts a path", (command) => {
  expect(parseArgs([command])).toMatchObject({ command: "ls", path: "/ext" });
  expect(parseArgs([command, "/ext/nfc/My Cards"])).toMatchObject({ command: "ls", path: "/ext/nfc/My Cards" });
  expect(parseArgs([command, "/ext/nfc/"])).toMatchObject({ command: "ls", path: "/ext/nfc" });
  expect(parseArgs([command, "/"])).toMatchObject({ command: "ls", path: "/" });
});

test("parses options before and after the command", () => {
  expect(parseArgs(["--json", "--port", "/dev/ttyACM1", "send", "help", "--timeout", "9000", "--raw", "--idle", "100"])).toEqual({
    command: "send", lines: ["help"], port: "/dev/ttyACM1", timeout: 9000, idle: 100, raw: true, json: true,
  });
});

test("the separator preserves option-like serial input", () => {
  expect(parseArgs(["send", "--", "--json", "--port"])).toMatchObject({ lines: ["--json", "--port"], json: false });
});

test("watch uses seconds, accepts fractions, and preserves an explicit timeout", () => {
  expect(parseArgs(["watch"])).toMatchObject({ command: "watch", seconds: 5, timeout: 5000 });
  expect(parseArgs(["watch", "12.5"])).toMatchObject({ seconds: 12.5, timeout: 12500 });
  expect(parseArgs(["watch", "12", "--timeout", "2000"])).toMatchObject({ seconds: 12, timeout: 2000 });
});

test.each(["--help", "-h"])("accepts %s", (flag) => {
  expect(parseArgs([flag])).toMatchObject({ command: "help" });
});

test.each([
  { args: [], error: "A command is required" },
  { args: ["unknown"], error: "Unknown command" },
  { args: ["send"], error: "at least one" },
  { args: ["exec"], error: "at least one" },
  { args: ["run"], error: "at least one" },
  { args: ["port", "extra"], error: "does not accept" },
  { args: ["ls", "/ext", "/int"], error: "one path" },
  { args: ["ls", ""], error: "nonempty" },
  { args: ["ls", '/ext/"oops'], error: "quotes" },
  { args: ["watch", "1", "2"], error: "one duration" },
  { args: ["watch", "0"], error: "positive" },
  { args: ["watch", "NaN"], error: "positive" },
  { args: ["watch", "Infinity"], error: "positive" },
  { args: ["watch", "1e100"], error: "too large" },
  { args: ["info", "--port"], error: "needs a value" },
  { args: ["info", "--idle"], error: "needs a value" },
  { args: ["info", "--timeout", "--raw"], error: "needs a value" },
  { args: ["info", "--timeout", "0"], error: "positive integer" },
  { args: ["info", "--idle", "-1"], error: "positive integer" },
  { args: ["info", "--idle", "1.5"], error: "positive integer" },
  { args: ["info", "--idle", " "], error: "positive integer" },
  { args: ["info", "--port", "relative"], error: "absolute path" },
  { args: ["info", "--typo"], error: "Unknown option" },
  { args: ["send", "help\rdevice_info"], error: "one CLI line" },
  { args: ["send", "help\ndevice_info"], error: "one CLI line" },
  { args: ["send", "help\0"], error: "one CLI line" },
])("rejects invalid arguments: $args", ({ args, error }) => {
  expect(() => parseArgs(args)).toThrow(error);
});

const devices = [
  "/dev/ttyACM1", "/dev/ttyACM0", "/dev/serial/by-id/usb-Flipper-Zero",
  "/dev/cu.usbmodemflip_Z", "/dev/cu.usbmodemflip_A", "/dev/cu.unrelated",
];

test.each(["darwin", "linux"])("discovery keeps the required priority on %s", (platform) => {
  const original = [...devices];
  const input = { platform, env: {}, candidates: devices };
  expect(discoverPort({ ...input, port: "/dev/explicit", env: { FLIPPER_PORT: "/dev/environment" } })).toBe("/dev/explicit");
  expect(discoverPort({ ...input, env: { FLIPPER_PORT: "/dev/environment" } })).toBe("/dev/environment");
  expect(discoverPort(input)).toBe("/dev/cu.usbmodemflip_A");
  expect(discoverPort({ ...input, candidates: devices.slice(0, 3) })).toBe("/dev/serial/by-id/usb-Flipper-Zero");
  expect(discoverPort({ ...input, candidates: devices.slice(0, 2) })).toBe("/dev/ttyACM0");
  expect(discoverPort({ ...input, env: { FLIPPER_PORT: "" } })).toBe("/dev/cu.usbmodemflip_A");
  expect(input.candidates).toEqual(original);
});

test("discovery reports no device without selecting an unrelated port", () => {
  expect(() => discoverPort({ platform: "linux", env: {}, candidates: ["/dev/ttyUSB0", "/dev/ttyACM0/child", "/dev/serial/by-id/Other"] })).toThrow("No Flipper serial device found on linux");
  expect(() => discoverPort({ platform: "darwin", env: { FLIPPER_PORT: "-bad" }, candidates: devices })).toThrow("absolute path");
});

test.each(["screen", "SCREEN", "minicom", "tio", "picocom", "cu", "socat", "/usr/bin/screen", " /usr/bin/SCREEN\n"])("allows serial terminal %s", (comm) => {
  expect(isSerialTerminal(comm)).toBe(true);
});

test.each(["qFlipper", "/usr/local/bin/qFlipper", "Brave Browser", "Google Chrome", "screen-helper", "node", "bash", "screen /dev/ttyACM0", "", "/tmp/screen/browser"])("refuses other holder %s", (comm) => {
  expect(isSerialTerminal(comm)).toBe(false);
});

test("strips color, cursor, and hyperlink controls while preserving text and line endings", () => {
  expect(stripAnsi("\x1b[31mRed\x1b[0m\r\n>: ")).toBe("Red\r\n>: ");
  expect(stripAnsi("\x1b[2J\x1b[HDevice ✓\n")).toBe("Device ✓\n");
  expect(stripAnsi("\x1b]8;;https://example.com\x07link\x1b]8;;\x07")).toBe("link");
  expect(stripAnsi("plain\ttext\n")).toBe("plain\ttext\n");
  expect(stripAnsi("")).toBe("");
});
