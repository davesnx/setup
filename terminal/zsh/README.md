# Reduce Zsh startup time and keep completion

Use this guide to measure this setup, find repeated work, change one thing,
and check the terminal behavior before keeping the change.

## 1. Measure the installed setup

From the setup repository root, with Bash and Zsh installed, run:

```sh
terminal/bin/testzsh --help
terminal/bin/testzsh
terminal/bin/testzsh --profile
terminal/bin/testzsh --trace
```

Use the explicit path. An old `testzsh` alias or function can mask the command
when you call it by name. The helper selects the Zsh executable on `PATH`.
It loads your installed startup files, not the checkout's files automatically.
Confirm that the installed links point to the checkout you intend to measure.
Export `ZDOTDIR` first if your setup uses an unexported value.

The default command prints 25 timing lines. `real` is elapsed time. `user`
and `sys` are CPU time. Keep the first run separate from the warm runs that
follow it. The first run can build caches. It is not necessarily a cold-machine
measurement, because the operating system may already have cached the files.

Run several batches before and after a change. Compare the median and range
of the warm `real` values. Keep the machine, working directory, Zsh executable,
exported environment, and background load as close as possible between batches.
Do not compare one fast run with one slow run or mix Mac and nspawn results.

Repeat in representative Node and OCaml projects. Use the helper's absolute
path from those directories so the shell starts in the project being tested.

## 2. Read the measurement boundary

The helper starts login, interactive shells and waits for startup to complete.
On macOS, `.zshenv` unsets `GLOBAL_RCS`, so `/etc/zprofile` and `/etc/zshrc`
do not run. They fork `path_helper` and `locale` on every start. `.zprofile`
rebuilds PATH, Ghostty sets MANPATH, and `.zshrc` keeps `COMBINING_CHARS` and
`disable log` from `/etc/zshrc`. Linux keeps its system files. After completed
startup, the helper's fixed command disables history saving and logout files
before the shell exits. `ZSH_BENCHMARK=1` disables this setup's instant prompt
during measurement.

Startup stdout and stderr are suppressed. A completed report does not prove
that startup had no errors. Open a normal fresh shell to inspect failures.
Do not repeatedly source `.zshrc` in an existing shell as a startup test.

The helper does not run the prompt or interactive line editor. Work scheduled
with `zsh-defer` can therefore be absent from every report. In this setup that
includes syntax highlighting, history substring search, autosuggestions, fzf
key bindings, Dune completion, and normally opam initialization. The
`CURSOR_AGENT` path initializes opam synchronously.

A prompt on screen does not prove that input and tools are ready. Check typing,
the first completion, and the first project command in a real fresh terminal.
Moving work after startup is useful only if those operations still work when
you need them.

## 3. Find the repeated work

Use `--profile` to inspect function costs:

- `calls` shows how often a function ran.
- `time` includes the function and functions it called.
- `self` excludes time in called functions.
- Each time group also shows a per-call average and a percentage.

Do not add inclusive `time` rows. A parent and its child contain the same child
time. Percentages describe time in profiled functions, not total shell startup.
Top-level commands are outside the function report.
An autoload wrapper can also add a call. Inspect the call tree before treating
a count of two as duplicate initialization.

Use `--trace` to locate work that the function report cannot explain. It reports
exclusive file totals and the top 20 source locations, with milliseconds and
event counts. Inspect the named file and line for repeated sourcing, command
substitutions, or environment initialization.

The trace records source locations rather than shell `xtrace` command text.
It omits expanded arguments and assignments that could expose secrets. Source
filenames remain visible. The intervals include waits and tracing overhead.
Do not compare trace totals with the default timing baseline. Use the trace to
choose what to inspect, then use default timing to measure the change.

## 4. Change one cause and retain the current behavior

Edit the managed source in this repository. Use the module installer when
links need updating, then open a fresh shell. Do not edit a linked home copy.
Keep each experiment small enough to explain its effect in the reports.

### Keep one completion setup

`completion.zsh` replaces the init of Zim's completion module. `.zimrc` keeps
the module for its `_zimfw` function only. `.zshrc` sets `typeset -U fpath`
before loading Zim so inherited duplicate completion paths cannot expand the
list, and sources `completion.zsh` right after Zim, so every completion path is
already in `fpath`.

Zim compares the modification time of every completion file with its dump
data, about 1200 files on this Mac. `completion.zsh` compares the Zsh version,
the `fpath` directories, and their modification times instead. An install adds
or removes files, which updates the directory time and rebuilds the dump. An
edit inside an existing completion file does not. After such an edit, run
`rm ~/.zcompdump*` and open a new shell.

A `compdump` call in the profile indicates a dump rebuild. A rebuild after a
completion install is expected. Rebuilds on unchanged warm starts need
inspection. Check `fpath` before deleting caches or disabling completion.
Retain the dump and its compiled cache for normal measurements.

The current Dune setup registers its Bash completion through `bashcompinit`
after Zim. It supplies the `compopt` compatibility function and sources
`~/.local/share/dune/completions/bash.sh` when present. Keep that registration
without sourcing Dune's `env.zsh`, which would call `compinit` again.
Deferred Dune completion still needs a real Tab test.

The custom prompt is sourced directly from `themes/prompt_davesnx_setup`.
Keep that direct load rather than adding another theme discovery pass.

### Apply tool environments at the correct time

Keep `fnm env --use-on-cd --shell zsh` once per shell, synchronous and before
the direnv hook. fnm needs a separate environment for each shell. Reusing an
inherited environment can couple Node selection between terminals.
direnv must record a PATH that already contains the shell's Node environment.

`cached-init.zsh` defines `_cached_init`. It sources the direnv hook and the
zoxide init text from `~/.cache/zsh/<tool>.zsh` instead of running the tool on
every start. The first cache line records the resolved executable path. The
cache is rebuilt when that path changes, such as after a Homebrew upgrade, or
when the executable is newer than the cache. A failed run leaves an empty cache
and the next start runs the tool again. Do not cache `fnm env` this way, for
the reason above.

`.zprofile` resets PATH. An inherited active opam switch does not prove that
its executable paths survived that reset. `_initialize_opam` clears the active
switch marker and reapplies the selected environment. Keep the local-switch
entry and exit hook, including restoration of the default environment.

## 5. Keep Zim maintenance outside repeated startup work

In a configured interactive shell, inspect available updates with:

```sh
zimfw check -v
zimfw check-version
```

`check -v` checks module updates and includes skipped and current modules.
`check-version` checks the framework version. Neither command installs updates.
Choose maintenance separately from the startup experiment:

- `zimfw build` regenerates initialization from `.zimrc` and compiles scripts.
- `zimfw update` updates modules, then builds and compiles.
- `zimfw upgrade` updates the framework and compiles.

Zim compiles enabled module scripts during build. The generated `init.zsh`
loads modules without a startup compile loop. `.zshrc` requests initialization
only when the generated file is missing or no newer than `.zimrc`.

For startup files and ordinary sourced scripts, a newer adjacent `.zwc` file
takes precedence. A stale compiled copy is ignored. Compilation avoids parsing,
but does not remove subprocesses or repeated initialization. Do not add manual
compilation or a startup compile loop without a measured benefit.

## 6. Verify the result

Repeat all three reports from step 1. Confirm that the expected calls or source
costs changed and that several warm timing batches show a repeatable benefit.
Then open a real fresh terminal and check:

- Type `dune buil` and press Tab. It must complete to `dune build`.
- Type a history fragment and use the up and down arrows. Check autosuggestions.
- Type the first command and check that syntax highlighting colors it before
  you press Enter.
- Open the fzf history picker with Ctrl+R. Select a result and cancel another.
- Use `j` to enter a known directory. Confirm the destination.
- Enter Node projects with different version files. Check `node --version`.
  Change versions in one terminal and confirm another terminal keeps its version.
- Enter and leave an opam local switch. Check `opam switch show`,
  `command -v ocamlc`, and `ocamlc -version`. Run `sh -c 'command -v ocamlc'`
  to confirm that child tools receive the selected path. Check restoration on exit.
- Enter an already allowed direnv project. Check its expected variable and tool
  path. Leave it and confirm that its environment unloads.

Repeat entry and exit to catch state left by the previous directory. Test the
first command as well as later commands after deferred work has finished.
Keep a change only when the timing gain and the required behavior both hold.

See the [testzsh reference](../bin/README.md#measure-zsh-startup) for report details
and [setup checks](../../TESTING.md) for automated checks and host requirements.
