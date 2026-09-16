#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

need fnm

node_version=22.22.3
pnpm_version=10.30.3

case "$(uname -m)" in
  arm64 | aarch64) node_arch=arm64 ;;
  x86_64) node_arch=x64 ;;
  *)
    echo "Unsupported Node architecture: $(uname -m)" >&2
    exit 69
    ;;
esac

fnm_env=$(fnm env --shell bash)
eval "$fnm_env"
fnm install --arch "$node_arch" "$node_version"
fnm use "$node_version"
# fnm reuses existing versions, including ones migrated from another architecture.
node -e '
  if (process.arch !== process.argv[1]) {
    console.error("Expected " + process.argv[1] + " Node, found " + process.arch + ". Reinstall this version with fnm before continuing.");
    process.exit(1);
  }
' "$node_arch"
fnm default "$node_version"

corepack enable pnpm yarn
corepack prepare "pnpm@$pnpm_version" --activate

# Keep shared CLIs outside fnm so switching Node versions does not hide them.
node_tools="$HOME/.local/share/node-tools"
link_path "$DOTFILES_PATH/terminal/node/package.json" "$node_tools/package.json"
link_path "$DOTFILES_PATH/terminal/node/package-lock.json" "$node_tools/package-lock.json"
npm ci --prefix "$node_tools" --omit=dev --no-audit --no-fund
