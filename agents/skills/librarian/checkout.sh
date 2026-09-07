#!/usr/bin/env bash
# Local change: default to ~/.librarian. See UPSTREAM.md.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: checkout.sh <repo> [options]

Ensure a cached checkout exists at:
  ~/.librarian/<host>/<org>/<repo>

Examples:
  checkout.sh mitsuhiko/minijinja
  checkout.sh github.com/mitsuhiko/minijinja
  checkout.sh https://github.com/mitsuhiko/minijinja
  checkout.sh git@github.com:mitsuhiko/minijinja.git

Options:
  --path-only                 Print only the checkout path.
  --force-update              Always fetch from origin and attempt fast-forward.
  --update-interval <secs>    Minimum seconds between updates (default: 300).

Environment:
  LIBRARIAN_CACHE_ROOT        Override cache root (default: ~/.librarian)
  LIBRARIAN_DEFAULT_HOST      Host for owner/repo shorthand (default: github.com)
  LIBRARIAN_UPDATE_INTERVAL   Default update interval in seconds
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

repo_input=""
path_only=0
force_update=0
update_interval="${LIBRARIAN_UPDATE_INTERVAL:-300}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --path-only)
      path_only=1
      shift
      ;;
    --force-update)
      force_update=1
      shift
      ;;
    --update-interval)
      if [[ $# -lt 2 ]]; then
        echo "error: --update-interval expects a value" >&2
        exit 2
      fi
      update_interval="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "$repo_input" ]]; then
        repo_input="$1"
      else
        echo "error: unexpected argument: $1" >&2
        exit 2
      fi
      shift
      ;;
  esac
done

if [[ -z "$repo_input" ]]; then
  echo "error: repository is required" >&2
  exit 2
fi

if ! [[ "$update_interval" =~ ^[0-9]+$ ]]; then
  echo "error: update interval must be a non-negative integer" >&2
  exit 2
fi

trim_repo_input() {
  local s="$1"
  # Trim leading/trailing whitespace.
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

parse_repo() {
  local input host path first rest part
  input="$(trim_repo_input "$1")"

  # Strip query/fragment for URL-like inputs.
  input="${input%%\?*}"
  input="${input%%#*}"

  case "$input" in
    git@*:* )
      host="${input#git@}"
      host="${host%%:*}"
      path="${input#*:}"
      ;;
    ssh://* )
      rest="${input#ssh://}"
      host="${rest%%/*}"
      host="${host#*@}"
      path="${rest#*/}"
      ;;
    http://*|https://* )
      rest="${input#*://}"
      host="${rest%%/*}"
      path="${rest#*/}"
      ;;
    */* )
      first="${input%%/*}"
      if [[ "$first" == *.* || "$first" == localhost ]]; then
        host="$first"
        path="${input#*/}"
      else
        host="${LIBRARIAN_DEFAULT_HOST:-github.com}"
        path="$input"
      fi
      ;;
    * )
      echo "error: unsupported repository format: $input" >&2
      return 1
      ;;
  esac

  path="${path#/}"
  path="${path%/}"

  # For GitHub-like deep links, use owner/repo only.
  IFS='/' read -r -a parts <<< "$path"
  if [[ ${#parts[@]} -ge 3 ]]; then
    case "${parts[2]}" in
      tree|blob|pull|issues|commit|actions|releases|compare|wiki)
        path="${parts[0]}/${parts[1]}"
        ;;
    esac
  fi

  # Strip optional .git suffix.
  path="${path%.git}"

  IFS='/' read -r -a parts <<< "$path"
  if [[ ${#parts[@]} -lt 2 ]]; then
    echo "error: repository path must contain at least org/repo: $path" >&2
    return 1
  fi

  if ! [[ "$host" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?$ ]] ||
    [[ "$host" == *..* || "$host" == *. ]]; then
    echo "error: invalid repository host: $host" >&2
    return 1
  fi

  for part in "${parts[@]}"; do
    if [[ -z "$part" || "$part" == "." || "$part" == ".." ||
      ! "$part" =~ ^[A-Za-z0-9._-]+$ ]]; then
      echo "error: invalid repository path component: $part" >&2
      return 1
    fi
  done

  local last_index=$(( ${#parts[@]} - 1 ))
  local repo="${parts[$last_index]}"
  local org_parts=("${parts[@]:0:$last_index}")
  local org
  org="$(IFS='/'; echo "${org_parts[*]}")"

  if [[ -z "$host" || -z "$org" || -z "$repo" ]]; then
    echo "error: failed to parse repository: $input" >&2
    return 1
  fi

  printf '%s\t%s\t%s\n' "$host" "$org" "$repo"
}

if ! parsed="$(parse_repo "$repo_input")"; then
  exit 2
fi
IFS=$'\t' read -r host org repo <<< "$parsed"

cache_root="${LIBRARIAN_CACHE_ROOT:-$HOME/.librarian}"
origin_url="https://$host/$org/$repo.git"

mkdir -p "$cache_root"
cache_root="$(cd -P "$cache_root" && pwd)"
checkout_parent="$cache_root"
IFS='/' read -r -a parent_parts <<< "$host/$org"
for part in "${parent_parts[@]}"; do
  next_parent="$checkout_parent/$part"
  if [[ -L "$next_parent" ]]; then
    echo "error: cache path contains a symlink: $next_parent" >&2
    exit 3
  fi
  if [[ -e "$next_parent" && ! -d "$next_parent" ]]; then
    echo "error: cache path is not a directory: $next_parent" >&2
    exit 3
  fi
  mkdir -p "$next_parent"
  checkout_parent="$next_parent"
done

checkout_parent="$(cd -P "$checkout_parent" && pwd)"
if [[ "$checkout_parent" != "$cache_root" && "$checkout_parent" != "$cache_root/"* ]]; then
  echo "error: checkout path escapes cache root: $checkout_parent" >&2
  exit 3
fi

checkout_path="$checkout_parent/$repo"
if [[ -L "$checkout_path" ]]; then
  echo "error: checkout path is a symlink: $checkout_path" >&2
  exit 3
fi

if [[ ! -d "$checkout_path/.git" ]]; then
  git clone --filter=blob:none "$origin_url" "$checkout_path" >/dev/null
  clone_state="cloned"
else
  clone_state="existing"
fi

if [[ ! -d "$checkout_path/.git" ]]; then
  echo "error: checkout path is not a git repository: $checkout_path" >&2
  exit 3
fi

if ! git -C "$checkout_path" remote get-url origin >/dev/null 2>&1; then
  git -C "$checkout_path" remote add origin "$origin_url"
fi

# If remote URL changed (e.g. host shorthand), normalize to canonical HTTPS URL.
current_origin="$(git -C "$checkout_path" remote get-url origin 2>/dev/null || true)"
if [[ "$current_origin" != "$origin_url" ]]; then
  git -C "$checkout_path" remote set-url origin "$origin_url"
fi

last_fetch_file="$checkout_path/.git/librarian-last-fetch"
now_epoch="$(date +%s)"
needs_update=1

if [[ -f "$last_fetch_file" && "$force_update" -eq 0 ]]; then
  last_epoch="$(cat "$last_fetch_file" 2>/dev/null || echo 0)"
  if [[ "$last_epoch" =~ ^[0-9]+$ ]]; then
    age=$(( now_epoch - last_epoch ))
    if (( age < update_interval )); then
      needs_update=0
    fi
  fi
fi

update_state="skipped"
ff_state="not-attempted"

if (( needs_update == 1 )); then
  git -C "$checkout_path" fetch --prune --tags origin >/dev/null
  echo "$now_epoch" > "$last_fetch_file"
  update_state="fetched"

  branch="$(git -C "$checkout_path" symbolic-ref --short -q HEAD 2>/dev/null || true)"
  upstream="$(git -C "$checkout_path" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  dirty="$(git -C "$checkout_path" status --porcelain --untracked-files=no)"

  if [[ -n "$branch" && -n "$upstream" && -z "$dirty" ]]; then
    if git -C "$checkout_path" merge --ff-only "$upstream" >/dev/null 2>&1; then
      ff_state="fast-forwarded"
    else
      ff_state="skipped-non-ff"
    fi
  elif [[ -n "$dirty" ]]; then
    ff_state="skipped-dirty"
  else
    ff_state="skipped-no-upstream"
  fi
fi

if (( path_only == 1 )); then
  printf '%s\n' "$checkout_path"
  exit 0
fi

cat <<EOF
repo: $host/$org/$repo
path: $checkout_path
state: $clone_state
update: $update_state
fast_forward: $ff_state
EOF
