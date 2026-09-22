import { afterEach, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { mountPicker, type PickerOptions, type Session } from "./picker.ts";

const sessions: Session[] = Array.from({ length: 23 }, (_, index) => ({
  id: `ses_${index}`,
  title: `Session ${index}`,
  directory: "/project",
  updated: Date.now() - (index < 12 ? 0 : 86_400_000),
}));
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

async function setup(
  load: PickerOptions["load"] = async () => sessions,
  width = 100,
  height = 40,
) {
  const view = await createTestRenderer({
    width,
    height,
    exitOnCtrlC: false,
    kittyKeyboard: true,
  });
  const selected: Session[] = [];
  let cancellations = 0;
  const cleanup = mountPicker(view.renderer, {
    load,
    select: (session) => selected.push(session),
    cancel: () => cancellations++,
  });
  cleanups.push(() => {
    cleanup();
    view.renderer.destroy();
  });
  async function settle() {
    await Bun.sleep(180);
    await view.renderOnce();
    await view.renderOnce();
  }
  await settle();
  return { ...view, selected, cancelled: () => cancellations, settle };
}

test("renders the session dialog with date groups and scope hint", async () => {
  const view = await setup();
  const frame = view.captureCharFrame();
  expect(frame).toContain("Sessions");
  expect(frame).toContain("Search");
  expect(frame).toContain("Today");
  expect(frame).toContain("Session 0");
  expect(frame).toContain("current directory");
  expect(frame).toContain(new Date(Date.now() - 86_400_000).toDateString());
});

test.each([
  ["ARROW_UP", {}, 22],
  ["ARROW_DOWN", {}, 1],
  ["p", { ctrl: true }, 22],
  ["n", { ctrl: true }, 1],
  ["\u001b[5~", {}, 13],
  ["\u001b[6~", {}, 10],
  ["END", {}, 22],
])("%s navigates before Enter selects", async (key, modifiers, index) => {
  const view = await setup();
  view.mockInput.pressKey(key, modifiers);
  await view.renderOnce();
  expect(view.captureCharFrame()).toContain(`Session ${index}`);
  view.mockInput.pressEnter();
  expect(view.selected.map((session) => session.id)).toEqual([`ses_${index}`]);
});

test("Home selects the first session and page movement wraps short lists", async () => {
  const view = await setup(async () => sessions.slice(0, 3));
  view.mockInput.pressKey("END");
  view.mockInput.pressKey("HOME");
  view.mockInput.pressKey("\u001b[5~");
  view.mockInput.pressEnter();
  expect(view.selected[0]?.id).toBe("ses_2");
});

test("typing j/k searches, Ctrl+C clears search before cancelling", async () => {
  const queries: string[] = [];
  const view = await setup(async (query) => {
    queries.push(query);
    return sessions;
  });
  await view.mockInput.typeText("jk");
  await view.settle();
  expect(queries).toEqual(["", "jk"]);
  view.mockInput.pressCtrlC();
  await view.settle();
  expect(queries).toEqual(["", "jk", ""]);
  expect(view.cancelled()).toBe(0);
  view.mockInput.pressCtrlC();
  expect(view.cancelled()).toBe(1);
  expect(view.selected).toEqual([]);
});

test("Ctrl+A switches scope, preserving search text", async () => {
  const requests: { query: string; all: boolean }[] = [];
  const view = await setup(async (query, all) => {
    requests.push({ query, all });
    return sessions;
  });
  await view.mockInput.typeText("thing");
  await view.settle();
  view.mockInput.pressKey("a", { ctrl: true });
  await view.settle();
  expect(requests.at(-1)).toEqual({ query: "thing", all: false });
  expect(view.captureCharFrame()).toContain("Sessions for current directory");
  view.mockInput.pressKey("a", { ctrl: true });
  await view.settle();
  expect(requests.at(-1)).toEqual({ query: "thing", all: true });
});

test("empty results ignore navigation and Enter, Escape cancels", async () => {
  const view = await setup(async () => []);
  expect(view.captureCharFrame()).toContain("No sessions found");
  view.mockInput.pressKey("\u001b[5~");
  view.mockInput.pressEnter();
  expect(view.selected).toEqual([]);
  view.mockInput.pressEscape();
  expect(view.cancelled()).toBe(1);
});

test("failed searches can recover by changing the query", async () => {
  const view = await setup(async (query) => {
    if (!query) throw new Error("Service unavailable");
    return sessions;
  });
  expect(view.captureCharFrame()).toContain("Service unavailable");
  await view.mockInput.typeText("retry");
  await view.settle();
  view.mockInput.pressEnter();
  expect(view.selected[0]?.id).toBe("ses_0");
});

test("late search results cannot replace the latest results", async () => {
  let complete: (value: Session[]) => void = () => {};
  let firstSignal: AbortSignal | undefined;
  const view = await setup(async (query, _all, signal) => {
    if (!query) {
      firstSignal = signal;
      return new Promise((resolve) => {
        complete = resolve;
      });
    }
    return sessions.slice(1, 2);
  });
  await view.mockInput.typeText("new");
  await view.settle();
  expect(firstSignal?.aborted).toBe(true);
  complete(sessions);
  await view.settle();
  view.mockInput.pressEnter();
  expect(view.selected[0]?.id).toBe("ses_1");
});

test("cancel aborts a pending request and ignores its result", async () => {
  let signal: AbortSignal | undefined;
  let complete: (value: Session[]) => void = () => {};
  const view = await setup(async (_query, _all, requestSignal) => {
    signal = requestSignal;
    return new Promise((resolve) => {
      complete = resolve;
    });
  });
  view.mockInput.pressEscape();
  expect(signal?.aborted).toBe(true);
  complete(sessions);
  await view.settle();
  expect(view.cancelled()).toBe(1);
  expect(view.selected).toEqual([]);
});

test("resize keeps the selected session visible in a small terminal", async () => {
  const view = await setup();
  view.mockInput.pressKey("END");
  view.resize(40, 16);
  await view.settle();
  const frame = view.captureCharFrame();
  expect(frame).toContain("Session 22");
  expect(frame).toContain("ctrl+a");
  expect(frame.split("\n").every((line) => [...line].length <= 40)).toBe(true);
  view.mockInput.pressEnter();
  expect(view.selected[0]?.id).toBe("ses_22");
});
