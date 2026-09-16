# Node tooling

Homebrew installs fnm. The root installer then runs `install.sh` in this folder
before any npm-dependent setup phases and activates the selected default in its
own shell.

Runtime versions are kept in `install.sh`:

- Node 22.22.3, using the host architecture (ARM64 on Apple Silicon).
- pnpm 10.30.3, managed through the bundled Corepack. Yarn shims are also enabled.

## Shared CLI packages

`package.json` declares the shared CLI dependencies, with `package-lock.json`
locking their dependency tree:

- `@googleworkspace/cli` (`gws`)
- `@playwright/cli` (`playwright-cli`)
- `@th0rgal/ralph-wiggum` (`ralph`)
- `pilcrow-ink` (`pilcrow`)
- `vercel`
- `wrangler`

The installer symlinks both files into `~/.local/share/node-tools` and runs
`npm ci` there. Existing manifest files are backed up using the setup installer's
usual backup directory. Dependencies stay outside the repo and outside fnm's
version-specific directories.

The login shell adds `~/.local/share/node-tools/node_modules/.bin` to `PATH`, so
these commands remain available when switching Node versions. They use the Node
selected by fnm; their own runtime requirements still apply.

To provision only these tools after fnm is installed, run from the repo root:

```sh
sh terminal/node/install.sh
fnm use default
```

Open a new terminal after the first installation to pick up the CLI path.

## Interactive npm wrapper

The setup zsh configuration loads `npm.zsh`. Global install, uninstall, and update
commands operate on the shared CLI installation and save changes through the
manifest symlinks into this repo:

```sh
npm install -g some-cli
npm i --global @scope/some-cli@latest
npm uninstall -g some-cli
npm update -g
```

Installs save exact versions in `dependencies`. `update` follows npm's normal
dependency-range rules, so use `npm install -g some-cli@latest` to upgrade a pinned
package. The wrapper also recognizes `add`, `un`, `remove`, `rm`, `r`, `unlink`,
`up`, and `upgrade`. Global flags can precede the command or follow it.

Local commands and other npm subcommands pass through unchanged. Commands with
an explicit `--prefix`, `-C`, or `--location` also pass through. Arguments after
`--` are treated as package arguments, not wrapper options. The shared manifest
links must already exist; run the installer first if prompted.

For a genuine fnm-global operation, use the `_npm` bypass alias:

```sh
_npm install -g some-cli
```

To load the wrapper in an existing terminal:

```sh
source "$DOTFILES_PATH/terminal/node/npm.zsh"
```

## Editing the manifest directly

To add or update a CLI without the wrapper, run from the repo root:

```sh
npm install --package-lock-only --ignore-scripts --save-exact --prefix terminal/node <package>@<version>
sh terminal/node/install.sh
```

To remove one, remove its dependency from `package.json`, regenerate the lockfile,
and rerun the installer:

```sh
npm install --package-lock-only --ignore-scripts --prefix terminal/node
sh terminal/node/install.sh
```

Keep both manifest files in version control. The normal installer uses `npm ci`,
so it does not rewrite them.

The installer rejects an existing Node installation with the wrong architecture.
It does not delete older runtimes or their global packages. Project-specific
`.node-version` and `.nvmrc` files still override the default through the shell's
fnm hook.

Keep Node and `playwright-cli` out of the Brewfile: Homebrew's `playwright-cli`
formula brings Homebrew Node back as a dependency. For an existing installation,
remove that formula after provisioning the npm replacement:

```sh
brew uninstall playwright-cli
```

Older fnm-global copies can be removed with `_npm uninstall -g` once the
shared installation works; fnm's global binaries otherwise take precedence in
interactive shells.

## Check the wrapper

```sh
zsh terminal/node/tests/npm-wrapper.zsh
```

The tests cover argument forwarding and run real npm against a temporary,
offline package to verify manifest updates and CLI installation/removal.
