import {
  BoxRenderable,
  InputRenderable,
  InputRenderableEvents,
  TextAttributes,
  TextRenderable,
  type CliRenderer,
  type KeyEvent,
} from "@opentui/core";
import { theme } from "./theme.ts";

export type Session = {
  id: string;
  title: string;
  directory: string;
  updated: number;
};

export type PickerOptions = {
  load: (
    query: string,
    allProjects: boolean,
    signal: AbortSignal,
  ) => Promise<Session[]>;
  select: (session: Session) => void;
  cancel: () => void;
};

function clean(text: string): string {
  return text.replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
}

export function mountPicker(renderer: CliRenderer, options: PickerOptions) {
  const overlay = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    alignItems: "center",
    backgroundColor: theme.background,
  });
  const panel = new BoxRenderable(renderer, {
    width: Math.min(88, renderer.width - 2),
    backgroundColor: theme.panel,
    paddingTop: 1,
    paddingBottom: 1,
  });
  overlay.add(panel);
  renderer.root.add(overlay);

  const heading = new BoxRenderable(renderer, {
    flexDirection: "row",
    paddingLeft: 4,
    paddingRight: 4,
    marginBottom: 1,
  });
  const title = new TextRenderable(renderer, {
    content: "Sessions",
    fg: theme.text,
    attributes: TextAttributes.BOLD,
    flexGrow: 1,
    flexShrink: 1,
    height: 1,
    truncate: true,
  });
  heading.add(title);
  heading.add(
    new TextRenderable(renderer, {
      content: "esc",
      fg: theme.muted,
      onMouseUp: () => finish(),
    }),
  );
  panel.add(heading);

  const input = new InputRenderable(renderer, {
    placeholder: "Search",
    textColor: theme.text,
    placeholderColor: theme.muted,
    focusedBackgroundColor: theme.panel,
    backgroundColor: theme.panel,
    focusedTextColor: theme.text,
    cursorColor: theme.primary,
    marginLeft: 4,
    marginRight: 4,
    marginBottom: 1,
  });
  panel.add(input);
  const list = new BoxRenderable(renderer, { flexDirection: "column" });
  panel.add(list);
  const footer = new TextRenderable(renderer, {
    content: "↑↓ select  enter open",
    fg: theme.muted,
    marginTop: 1,
    marginLeft: 4,
    marginRight: 4,
    height: 1,
    truncate: true,
  });
  panel.add(footer);

  let sessions: Session[] = [];
  let selected = 0;
  let offset = 0;
  let pending = true;
  let error = "";
  let generation = 0;
  let closed = false;
  let allProjects = true;
  let request: AbortController | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const topPadding = () => Math.floor(renderer.height / 8);
  const pageSize = () =>
    Math.max(1, Math.min(20, renderer.height - topPadding() - 9));

  function draw() {
    for (const child of list.getChildren()) child.destroyRecursively();
    const count = pageSize();
    footer.content =
      renderer.width < 65
        ? `ctrl+a ${allProjects ? "current directory" : "all projects"}`
        : `↑↓ select  enter open     ctrl+a ${allProjects ? "current directory" : "all projects"}`;
    if (pending || error || !sessions.length) {
      list.add(
        new TextRenderable(renderer, {
          content: clean(
            pending
              ? input.value.trim()
                ? "Searching sessions…"
                : "Loading sessions…"
              : error || "No sessions found",
          ),
          fg: error ? theme.error : theme.muted,
          marginLeft: 4,
          marginRight: 4,
          height: 1,
          truncate: true,
        }),
      );
      return;
    }
    type Line = { category: string } | { session: Session; index: number };
    const lines: Line[] = [];
    let category = "";
    for (const [index, session] of sessions.entries()) {
      const date = new Date(session.updated).toDateString();
      if (date !== category) {
        if (category) lines.push({ category: "" });
        lines.push({
          category: date === new Date().toDateString() ? "Today" : date,
        });
        category = date;
      }
      lines.push({ session, index });
    }
    const position = lines.findIndex(
      (line) => "index" in line && line.index === selected,
    );
    offset = Math.max(0, Math.min(offset, lines.length - count));
    if (position < offset) offset = position;
    if (position >= offset + count) offset = position - count + 1;
    for (const line of lines.slice(offset, offset + count)) {
      if ("category" in line) {
        list.add(
          new TextRenderable(renderer, {
            content: line.category,
            fg: theme.primary,
            attributes: TextAttributes.BOLD,
            marginLeft: 4,
            height: 1,
          }),
        );
        continue;
      }
      const { session, index } = line;
      const active = index === selected;
      const row = new BoxRenderable(renderer, {
        height: 1,
        flexDirection: "row",
        marginLeft: 1,
        marginRight: 1,
        paddingLeft: 3,
        paddingRight: 3,
        backgroundColor: active ? theme.primary : theme.panel,
        onMouseUp: () => finish(session),
      });
      row.add(
        new TextRenderable(renderer, {
          content: clean(session.title),
          fg: active ? theme.background : theme.text,
          flexGrow: 1,
          flexShrink: 1,
          height: 1,
          truncate: true,
        }),
      );
      list.add(row);
    }
  }

  async function load(query: string, revision: number) {
    try {
      request = new AbortController();
      const result = await options.load(
        query.trim(),
        allProjects,
        request.signal,
      );
      if (closed || revision !== generation) return;
      sessions = result;
      pending = false;
      draw();
    } catch (cause) {
      if (closed || revision !== generation) return;
      pending = false;
      error =
        cause instanceof Error ? cause.message : "Could not load sessions";
      draw();
    }
  }

  function search(query: string, delay: number) {
    clearTimeout(debounce);
    request?.abort();
    const revision = ++generation;
    selected = 0;
    offset = 0;
    pending = true;
    error = "";
    draw();
    debounce = setTimeout(() => void load(query, revision), delay);
  }

  function finish(session?: Session) {
    if (closed) return;
    cleanup();
    if (session) options.select(session);
    else options.cancel();
  }

  function keypress(key: KeyEvent) {
    const unmodified =
      !key.ctrl && !key.meta && !key.shift && !key.super && !key.hyper;
    const control =
      key.ctrl && !key.meta && !key.shift && !key.super && !key.hyper;
    if (
      (unmodified && key.name === "escape") ||
      (control && key.name === "c")
    ) {
      key.preventDefault();
      if (renderer.getSelection()) {
        renderer.clearSelection();
        return;
      }
      if (key.ctrl && input.value) {
        input.value = "";
        return;
      }
      finish();
      return;
    }
    if (control && key.name === "a") {
      key.preventDefault();
      allProjects = !allProjects;
      title.content = allProjects
        ? "Sessions"
        : "Sessions for current directory";
      search(input.value, 0);
      return;
    }
    const move =
      (unmodified && key.name === "up") || (control && key.name === "p")
        ? -1
        : (unmodified && key.name === "down") || (control && key.name === "n")
          ? 1
          : unmodified && key.name === "pageup"
            ? -10
            : unmodified && key.name === "pagedown"
              ? 10
              : undefined;
    if (
      move !== undefined ||
      (unmodified &&
        (key.name === "home" || key.name === "end" || key.name === "return"))
    ) {
      key.preventDefault();
      if (pending || error || !sessions.length) return;
      if (key.name === "return") return finish(sessions[selected]);
      if (key.name === "home") selected = 0;
      else if (key.name === "end") selected = sessions.length - 1;
      else
        selected =
          (((selected + (move ?? 0)) % sessions.length) + sessions.length) %
          sessions.length;
      draw();
    }
  }

  function resize() {
    panel.width = Math.max(1, Math.min(88, renderer.width - 2));
    overlay.paddingTop = topPadding();
    draw();
  }

  function cleanup() {
    if (closed) return;
    closed = true;
    clearTimeout(debounce);
    request?.abort();
    renderer.keyInput.off("keypress", keypress);
    renderer.off("resize", resize);
    overlay.destroyRecursively();
  }

  input.on(InputRenderableEvents.INPUT, (query: string) => search(query, 150));
  renderer.keyInput.on("keypress", keypress);
  renderer.on("resize", resize);
  resize();
  input.focus();
  search("", 0);
  return cleanup;
}
