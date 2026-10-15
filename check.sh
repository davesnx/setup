#!/usr/bin/env bash

set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)

usage() {
  printf 'Usage: bash check.sh [--shell-only | --help]\nRun all setup checks, or only ShellCheck and Zsh syntax checks.\n'
}

shell_only=false
if [[ $# -gt 1 ]]; then
  usage >&2
  exit 64
fi
if [[ $# -eq 1 ]]; then
  case "$1" in
    --shell-only) shell_only=true ;;
    --help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 64
      ;;
  esac
fi

required_tools=(git shellcheck zsh)
if ! "$shell_only"; then
  required_tools+=(shfmt bun node npm python3 jq)
fi
for tool in "${required_tools[@]}"; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf '%s is required to run the checks.\n' "$tool" >&2
    exit 69
  fi
done

files=()
zsh_files=()
while IFS= read -r -d '' file; do
  [[ -f "$root/$file" ]] || continue
  IFS= read -r first_line <"$root/$file" || true
  case "$first_line" in
    '#!'*zsh*) zsh_files+=("$root/$file") ;;
    '#!'*bash* | '#!'*'/sh' | '#!'*' sh' | '# shellcheck shell='*) files+=("$root/$file") ;;
    '#!'*) ;;
    *)
      case "${file##*/}" in
        *.sh) files+=("$root/$file") ;;
        *.zsh | .zimrc | .zshenv | .zshrc | .zprofile | .zlogin | .zlogout) zsh_files+=("$root/$file") ;;
      esac
      ;;
  esac
done < <(git -C "$root" ls-files --cached --others --exclude-standard -z)

status=0
for file in ${files[@]+"${files[@]}"}; do
  IFS= read -r first_line <"$file" || true
  shell=bash
  case "$first_line" in
    '#!'*'/sh' | '#!'*' sh' | '# shellcheck shell=sh') shell='sh' ;;
  esac
  case "$file" in */prelude.sh) shell='sh' ;; esac
  shellcheck --norc --external-sources --source-path=SCRIPTDIR --source-path="$root" \
    --shell="$shell" --format=gcc "$file" || status=1
done
for file in ${zsh_files[@]+"${zsh_files[@]}"}; do
  zsh -n "$file" || status=1
done
printf 'Checked %s shell scripts and %s Zsh scripts.\n' "${#files[@]}" "${#zsh_files[@]}"
if "$shell_only" || [[ "$status" -ne 0 ]]; then
  exit "$status"
fi

shfmt -d -i 2 -ci "$root/check.sh" \
  "$root/terminal/core/test.sh" "$root/terminal/bin/git-extras/test.sh" \
  "$root/terminal/bin/git-extras/git-effort" \
  "$root/terminal/bin/testzsh" "$root/terminal/bin/testzsh.test.sh"
git -C "$root" diff --check
git -C "$root" diff --cached --check

/bin/bash "$root/terminal/core/test.sh"
bash "$root/terminal/core/test.sh"
zsh "$root/terminal/core/test.sh"
/bin/bash "$root/terminal/bin/git-extras/test.sh"
bash "$root/terminal/bin/git-extras/test.sh"
/bin/bash "$root/terminal/bin/testzsh.test.sh"
bash "$root/terminal/bin/testzsh.test.sh"
bun test "$root/terminal/core/utils/docopts.test.ts"
bun test "$root/terminal/bin/flipper.test.ts"
bun test "$root/agents/mcp.test.ts"
bun test "$root/terminal/claude/mcp.test.ts"
bun test "$root/terminal/opencode/mcp.test.ts"
sh "$root/terminal/zsh/tests/agent-link.sh"
zsh "$root/terminal/zsh/tests/cached-init.zsh"
bash "$root/terminal/zsh/tests/syntax-selection.sh"
zsh "$root/terminal/bin/scripts.test.zsh"
sh "$root/mac/tests/shell-startup.sh"
zsh "$root/terminal/node/tests/npm-wrapper.zsh"
# Config syntax: .json and .jsonc files parse as JSON with comments and
# trailing commas allowed (the editor settings files use both).
json_files=()
while IFS= read -r -d '' file; do
  [ -e "$root/$file" ] || continue
  json_files+=("$root/$file")
done < <(git -C "$root" ls-files --cached --others --exclude-standard -z -- '*.json' '*.jsonc')
node - ${json_files[@]+"${json_files[@]}"} <<'JS'
const fs = require("fs");
const strip = (text) => {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === "\\") out += text[++i];
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 1;
    } else out += c;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
};
let bad = 0;
for (const file of process.argv.slice(2)) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  try {
    JSON.parse(strip(fs.readFileSync(file, "utf8")));
  } catch (error) {
    console.error(`Invalid JSON: ${file}: ${error.message}`);
    bad = 1;
  }
}
process.exit(bad);
JS

# Skills: SKILL.md starts with frontmatter whose name matches the directory and
# whose description is not empty.
for skill in "$root"/agents/skills/*/SKILL.md; do
  dir=$(basename "$(dirname "$skill")")
  if ! awk -v dir="$dir" '
    NR == 1 && $0 != "---" { exit 1 }
    NR > 1 && $0 == "---" { closed = 1; exit }
    /^name:/ { sub(/^name:[ ]*/, ""); gsub(/["\047]/, ""); name = $0 }
    /^description:/ { sub(/^description:[ ]*/, ""); desc = $0 }
    END { exit !(closed && name == dir && desc != "") }
  ' "$skill"; then
    printf 'Bad SKILL.md frontmatter (name must equal %s, description required): %s\n' "$dir" "$skill" >&2
    exit 1
  fi
done

# Deterministic skill and hook tests. Not run here: skill-creator test_run_eval
# (process pools and a fake claude), the Mermaid render test in
# plannotator-visual-explainer (needs the Plannotator monorepo), opencode
# tests/integration (needs the opencode binary), and skill-evals/eval-harness
# (own checks, see TESTING.md).
npm ci --silent --prefix "$root/terminal/claude/hooks"
node --test "$root/terminal/claude/hooks/auto-improve.test.ts"
node --test "$root/terminal/opencode/tests/agent-permission-boundaries.test.mjs"
bash "$root/agents/skills/skill-vendor/tests/skill-vendor.sh"
bash "$root/agents/skills/ssh-transfer/tests/ssh-transfer.sh"
bash "$root/agents/skills/librarian/tests/checkout.sh"
bun test "$root/agents/skills/plannotator-setup-goal/SKILL.test.ts"
bun test "$root/agents/skills/plannotator-visual-explainer/SKILL.test.ts" \
  --test-name-pattern '^(?!.*renders representative)'
(cd "$root/agents/skills/autoresearch" && python3 -m unittest discover -s tests)
(cd "$root/agents/skills/skill-creator" &&
  python3 -m unittest tests.test_aggregate_benchmark tests.test_generate_review \
    tests.test_quick_validate tests.test_run_loop)

sh "$root/terminal/bin/ocs/install.sh"
npm --prefix "$root/terminal/bin/ocs" run format:check
npm --prefix "$root/terminal/bin/ocs" run check
npm --prefix "$root/terminal/bin/ocs" test

# Layout: AGENTS.md names only paths that exist, every tracked directory in
# the first two levels has a row, and no tracked symlink is absolute.
tree=$(awk '/^```text/ { inside = 1; next } /^```/ { inside = 0 } inside && /^[^ `]/ { print $1 }' "$root/AGENTS.md")
for path in $tree; do
  if [[ ! -e "$root/$path" ]]; then
    printf 'AGENTS.md names a missing path: %s\n' "$path" >&2
    exit 1
  fi
done
while IFS= read -r dir; do
  if ! grep -q "^$dir/" <<<"$tree"; then
    printf 'Directory has no row in AGENTS.md: %s\n' "$dir" >&2
    exit 1
  fi
done < <(git -C "$root" ls-files | awk -F/ 'NF > 1 { print $1 } NF > 2 { print $1 "/" $2 }' | sort -u)
while IFS= read -r link; do
  if [[ "$(readlink "$root/$link")" == /* ]]; then
    printf 'Absolute symlink: %s\n' "$link" >&2
    exit 1
  fi
done < <(git -C "$root" ls-files -s | awk '$1 == "120000" { print $4 }')

if [[ "$(uname -s)" == Darwin ]]; then
  /bin/bash "$root/mac/tests/browser-cdp.sh"
  sh "$root/mac/tests/install.sh"
  sh "$root/mac/choosy/test.sh"
fi

printf 'All setup checks passed.\n'
