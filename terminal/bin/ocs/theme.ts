import fosk from "../../opencode/themes/fosk.json";

function color(name: keyof typeof fosk.theme): string {
  const reference = fosk.theme[name].dark;
  const definitions: Record<string, string> = fosk.defs;
  const value = definitions[reference];
  if (!value) throw new Error(`Missing fosk theme color: ${reference}`);
  return value;
}

export const theme = {
  background: color("background"),
  panel: color("backgroundPanel"),
  text: color("text"),
  muted: color("textMuted"),
  primary: color("primary"),
  error: color("error"),
};
