#!/bin/zsh

set -eu

root=${0:A:h:h:h:h}
original_path=$PATH
real_npm=$(whence -p npm)
real_node=$(whence -p node)
work=$(mktemp -d)
work=${work:A}
trap 'rm -rf "$work"' EXIT HUP INT TERM

export HOME="$work/home with spaces"
export DOTFILES_PATH="$work/setup with spaces"
export NPM_ARGUMENTS="$work/arguments"
tools="$HOME/.local/share/node-tools"
manifests="$DOTFILES_PATH/terminal/node"
mkdir -p "$work/bin" "$tools" "$manifests"
print -r -- '{"name":"wrapper-test-tools","version":"1.0.0","private":true,"dependencies":{}}' >"$manifests/package.json"
print -r -- '{"name":"wrapper-test-tools","version":"1.0.0","lockfileVersion":3,"requires":true,"packages":{"":{"name":"wrapper-test-tools","version":"1.0.0"}}}' >"$manifests/package-lock.json"
ln -s "$manifests/package.json" "$tools/package.json"
ln -s "$manifests/package-lock.json" "$tools/package-lock.json"

cat >"$work/bin/npm" <<'EOF'
#!/bin/sh
printf '%s\0' "$@" >"$NPM_ARGUMENTS"
exit "${NPM_EXIT_CODE:-0}"
EOF
chmod +x "$work/bin/npm"
export PATH="$work/bin:$original_path"
source "$root/terminal/node/npm.zsh"

expect_args() {
  printf '%s\0' "$@" >"$work/expected"
  cmp "$work/expected" "$NPM_ARGUMENTS"
}

managed_flags=(--global=false --prefix "$tools" --save --save-prod --save-exact --package-lock)

npm install -g @scope/tool@1.2.3 --registry=https://registry.npmjs.org
expect_args "${managed_flags[@]}" install @scope/tool@1.2.3 --registry=https://registry.npmjs.org
npm --global i 'tool with spaces' ''
expect_args "${managed_flags[@]}" i 'tool with spaces' ''
print 'PASS: global installs preserve scoped packages, quoting, and options'

for cmd in install i add uninstall un remove rm r unlink update up upgrade; do
  npm "$cmd" --global=true some-cli
  expect_args "${managed_flags[@]}" "$cmd" some-cli
done
print 'PASS: supported install, uninstall, and update aliases use the shared prefix'

npm install --save-dev some-cli
expect_args install --save-dev some-cli
npm install -- -g
expect_args install -- -g
npm run build -- --global
expect_args run build -- --global
npm install -g --global=false some-cli
expect_args install -g --global=false some-cli
npm install --no-global some-cli
expect_args install --no-global some-cli
npm list -g
expect_args list -g
npm
expect_args
command npm install -g some-cli
expect_args install -g some-cli
_npm install -g '@scope/some-cli@1.2.3' --registry='https://registry.npmjs.org'
expect_args install -g '@scope/some-cli@1.2.3' --registry='https://registry.npmjs.org'
print 'PASS: local commands, literal flags, read-only commands, command npm, and _npm pass through'

npm install -g --prefix '/custom prefix' some-cli
expect_args install -g --prefix '/custom prefix' some-cli
npm --prefix=/custom install -g some-cli
expect_args --prefix=/custom install -g some-cli
npm install -g -C/custom some-cli
expect_args install -g -C/custom some-cli
npm install -g --location=global some-cli
expect_args install -g --location=global some-cli
print 'PASS: explicit installation locations are respected'

npm install -g -- './package with spaces.tgz' -g
expect_args "${managed_flags[@]}" install -- "$PWD/./package with spaces.tgz" -g
npm install -g file:../package.tgz
expect_args "${managed_flags[@]}" install "file:$PWD/../package.tgz"
print 'PASS: local package paths keep the caller working directory'

export NPM_EXIT_CODE=37
if npm install -g some-cli; then
  exit 1
else
  [[ $? -eq 37 ]]
fi
unset NPM_EXIT_CODE
print 'PASS: npm failures propagate to the caller'

mv "$tools/package.json" "$tools/package.json.saved"
: >"$NPM_ARGUMENTS"
if npm install -g some-cli 2>"$work/error"; then
  exit 1
else
  [[ $? -eq 69 ]]
fi
[[ ! -s "$NPM_ARGUMENTS" ]]
mv "$tools/package.json.saved" "$tools/package.json"

mv "$tools/package-lock.json" "$tools/package-lock.json.saved"
print -r -- '{}' >"$tools/package-lock.json"
if npm install -g some-cli 2>"$work/error"; then
  exit 1
else
  [[ $? -eq 69 ]]
fi
[[ ! -s "$NPM_ARGUMENTS" ]]
mv -f "$tools/package-lock.json.saved" "$tools/package-lock.json"
print 'PASS: missing or replaced manifest links stop before npm runs'

# Exercise the real npm against an offline package, never the user's manifests.
export PATH="$original_path"
export npm_config_cache="$work/npm-cache"
mkdir -p "$work/fixture"
cat >"$work/fixture/package.json" <<'EOF'
{"name":"setup-wrapper-fixture","version":"1.0.0","bin":{"setup-wrapper-fixture":"cli.js"}}
EOF
printf '%s\n' '#!/usr/bin/env node' 'console.log("fixture works");' >"$work/fixture/cli.js"
chmod +x "$work/fixture/cli.js"
"$real_npm" pack "$work/fixture" --pack-destination "$work" --offline --ignore-scripts >"$work/pack.log" 2>&1
cd "$work"
npm install -g './setup-wrapper-fixture-1.0.0.tgz' --offline --ignore-scripts --no-audit --no-fund
"$real_node" -e '
  const fs = require("fs");
  const path = require("path");
  const root = process.env.DOTFILES_PATH + "/terminal/node";
  const target = process.env.HOME + "/.local/share/node-tools";
  for (const file of ["package.json", "package-lock.json"]) {
    if (!fs.lstatSync(path.join(target, file)).isSymbolicLink()) throw new Error(file + " is no longer a symlink");
    if (fs.realpathSync(path.join(target, file)) !== fs.realpathSync(path.join(root, file))) throw new Error(file + " points outside setup");
  }
  const manifest = require(path.join(root, "package.json"));
  const lock = require(path.join(root, "package-lock.json"));
  if (!manifest.dependencies["setup-wrapper-fixture"] ||
      lock.packages["node_modules/setup-wrapper-fixture"]?.version !== "1.0.0") {
    throw new Error("Setup manifests were not updated: " + JSON.stringify({manifest, lock}));
  }
'
[[ "$("$tools/node_modules/.bin/setup-wrapper-fixture")" = 'fixture works' ]]
print 'PASS: real npm updates both setup manifests through symlinks and installs a working CLI'

npm update -g --offline --ignore-scripts --no-audit --no-fund
npm uninstall -g setup-wrapper-fixture --offline --ignore-scripts --no-audit --no-fund
"$real_node" -e '
  const root = process.env.DOTFILES_PATH + "/terminal/node";
  const manifest = require(root + "/package.json");
  const lock = require(root + "/package-lock.json");
  if (manifest.dependencies?.["setup-wrapper-fixture"] ||
      lock.packages["node_modules/setup-wrapper-fixture"]) process.exit(1);
'
[[ ! -e "$tools/node_modules/.bin/setup-wrapper-fixture" ]]
for file in package.json package-lock.json; do
  [[ -L "$tools/$file" && "$tools/$file" -ef "$manifests/$file" ]]
done
print 'PASS: real npm update and uninstall keep the setup manifests in sync'
