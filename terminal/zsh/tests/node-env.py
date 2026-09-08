import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "node-env.zsh"
ZSH = shutil.which("zsh")
FNM = os.environ.get("FNM_TEST_BINARY") or shutil.which("fnm")
REAL_DIRENV = shutil.which("direnv")

DIRENV = r"""#!/bin/sh
printf '%s\n' '
_direnv_hook() {
  path=("${(@)path:#"$HOME/direnv/bin"}")
  if [[ -f .envrc ]]; then
    path=("$HOME/direnv/bin" "${path[@]}")
  fi
}
typeset -ag chpwd_functions precmd_functions
chpwd_functions=(_direnv_hook ${chpwd_functions:#_direnv_hook})
precmd_functions=(_direnv_hook ${precmd_functions:#_direnv_hook})
'
"""

PREAMBLE = r"""
set -e
zsh-defer() { deferred=$2; }
assert_eq() {
  if [[ "$1" != "$2" ]]; then
    print -u2 -r -- "expected <$2>, got <$1>"
    return 1
  fi
}
snapshot() {
  print -r -- "cwd=$PWD"
  print -r -- "FNM_DIR=${FNM_DIR:-}"
  print -r -- "FNM_MULTISHELL_PATH=${FNM_MULTISHELL_PATH:-}"
  print -r -- "PATH=$PATH"
  print -r -- "chpwd=${chpwd_functions[*]}"
  command -v node
  node --version
  fnm current
}
"""


@unittest.skipUnless(ZSH, "zsh is required")
class NodeEnvironment(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory(prefix="setup-node-env-")
        self.addCleanup(self.scratch.cleanup)
        self.home = Path(self.scratch.name) / "home with spaces"
        self.bin = self.home / "bin"
        self.bin.mkdir(parents=True)
        self.env = {
            "HOME": str(self.home),
            "PATH": str(self.bin),
            "ZDOTDIR": str(self.home / "zdot"),
            "XDG_CONFIG_HOME": str(self.home / "config"),
            "XDG_DATA_HOME": str(self.home / "data"),
            "XDG_CACHE_HOME": str(self.home / "cache"),
            "XDG_STATE_HOME": str(self.home / "state"),
            "MODULE": str(MODULE),
            "CURSOR_AGENT": "1",
        }
        self.write(self.bin / "direnv", DIRENV, executable=True)
        self.write(
            self.home / "direnv/bin/node", "#!/bin/sh\nprintf 'direnv-node\\n'\n", True
        )
        self.write(self.home / "node-project/.node-version", "22.1.0\n")
        self.write(self.home / "nvm-project/.nvmrc", "20.1.0\n")
        self.write(self.home / "node-project/.envrc", "")
        self.write(self.home / "nvm-project/.envrc", "")
        self.write(self.home / "plain/package.json", '{"engines":{"node":"99"}}')
        (self.home / "node-project/child").mkdir()

    def write(self, path, content, executable=False):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        if executable:
            path.chmod(0o755)

    def real_fnm(self):
        if not FNM:
            self.skipTest(
                "set FNM_TEST_BINARY or install fnm for real integration checks"
            )
        (self.bin / "fnm").symlink_to(Path(FNM).resolve())
        for version in ("20.1.0", "22.1.0"):
            self.write(
                self.home / f".fnm/node-versions/v{version}/installation/bin/node",
                f"#!/bin/sh\nprintf 'v{version}\\n'\n",
                True,
            )
        result = subprocess.run(
            [
                str(self.bin / "fnm"),
                "--fnm-dir",
                str(self.home / ".fnm"),
                "alias",
                "20.1.0",
                "default",
            ],
            env=self.env,
            cwd=self.home,
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def real_direnv(self):
        if not REAL_DIRENV:
            self.skipTest("direnv is required for its real hook check")
        (self.bin / "direnv").unlink()
        (self.bin / "direnv").symlink_to(REAL_DIRENV)
        self.env["PATH"] += ":/usr/bin:/bin"
        for directory in ("node-project", "nvm-project", "direnv-project"):
            envrc = self.home / directory / ".envrc"
            self.write(envrc, 'PATH_add "$HOME/direnv/bin"\n')
            subprocess.run(
                [REAL_DIRENV, "allow", str(envrc)],
                env=self.env,
                cwd=self.home,
                check=True,
                capture_output=True,
                timeout=10,
            )

    def shell(self, script, cwd="plain"):
        result = subprocess.run(
            [ZSH, "-f", "-c", PREAMBLE + script],
            env=self.env,
            cwd=self.home / cwd,
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
        print(
            f"\n{self.id()}: zsh -f -c, HOME={self.home}, exit={result.returncode}\n"
            f"{result.stdout}{result.stderr}",
            end="",
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def test_startup_projects_and_fresh_state(self):
        self.real_fnm()
        for directory, version in (
            ("node-project", "v22.1.0"),
            ("nvm-project", "v20.1.0"),
        ):
            with self.subTest(directory=directory):
                self.shell(
                    r'''
fnm --version
source "$MODULE"
assert_eq "$(node --version)" "'''
                    + version
                    + r""""
assert_eq "$FNM_DIR" "$HOME/.fnm"
assert_eq "$FNM_VERSION_FILE_STRATEGY" local
[[ -L "$FNM_MULTISHELL_PATH" ]]
snapshot
""",
                    directory,
                )

    def test_directory_changes_repeated_source_and_child_shell(self):
        self.real_fnm()
        self.env["TEST_ZSH"] = ZSH
        self.shell(r"""
source "$MODULE"
assert_eq "$(node --version)" v20.1.0
original=$FNM_MULTISHELL_PATH
cd "$HOME/node-project"
assert_eq "$(node --version)" v22.1.0
source "$MODULE"
source "$MODULE"
assert_eq "$FNM_MULTISHELL_PATH" "$original"
assert_eq "${chpwd_functions[*]}" '_direnv_hook _fnm_post_direnv_hook'
entries=("${(@M)path:#"$FNM_MULTISHELL_PATH/bin"}")
assert_eq "${#entries}" 1
snapshot
child=$("$TEST_ZSH" -f -c 'zsh-defer() { :; }; source "$MODULE" >/dev/null; print -r -- "$FNM_MULTISHELL_PATH"')
[[ "$child" != "$original" ]]
cd "$HOME/nvm-project"
assert_eq "$(node --version)" v20.1.0
cd "$HOME/node-project"
cd child
assert_eq "$(node --version)" v22.1.0
cd "$HOME/plain"
assert_eq "$(node --version)" v22.1.0
assert_eq "$FNM_MULTISHELL_PATH" "$original"
snapshot
""")
        self.assertEqual(len(list((self.home / "state/fnm_multishells").iterdir())), 2)

    def test_configured_installation_directory_and_local_strategy(self):
        self.real_fnm()
        custom = self.home / "custom-fnm"
        custom.symlink_to(self.home / ".fnm", target_is_directory=True)
        self.env["FNM_DIR"] = str(custom)
        self.env["FNM_VERSION_FILE_STRATEGY"] = "recursive"
        self.shell(
            r"""
source "$MODULE"
assert_eq "$FNM_DIR" "$HOME/custom-fnm"
assert_eq "$FNM_VERSION_FILE_STRATEGY" local
assert_eq "$(node --version)" v20.1.0
snapshot
""",
            "node-project/child",
        )

    def test_deferred_direnv_order(self):
        self.real_fnm()
        self.env.pop("CURSOR_AGENT")
        self.shell(
            r"""
source "$MODULE"
original=$FNM_MULTISHELL_PATH
assert_eq "$(node --version)" v22.1.0
eval "$deferred"
assert_eq "$(node --version)" v22.1.0
source "$MODULE"
eval "$deferred"
assert_eq "$FNM_MULTISHELL_PATH" "$original"
assert_eq "${chpwd_functions[*]}" '_direnv_hook _fnm_post_direnv_hook'
assert_eq "${precmd_functions[*]}" _direnv_hook
cd "$HOME/nvm-project"
assert_eq "$(node --version)" v20.1.0
snapshot
""",
            "node-project",
        )

    def test_optional_fnm_missing(self):
        self.shell(r"""
source "$MODULE"
source "$MODULE"
assert_eq "${FNM_MULTISHELL_PATH:-}" ''
assert_eq "${_setup_fnm_initialized:-}" ''
assert_eq "$PATH" "$HOME/bin"
cd "$HOME/node-project"
assert_eq "$(node --version)" direnv-node
print 'PASS: missing fnm leaves direnv usable'
""")

    def test_failed_env_output_is_not_evaluated(self):
        self.write(
            self.bin / "fnm",
            '#!/bin/sh\nprintf \'%s\\n\' "$1" >> "$HOME/fnm-calls"\n'
            "printf 'export PATH=/broken\\n'\nprintf 'env failed\\n' >&2\nexit 7\n",
            True,
        )
        self.write(self.home / "plain/.envrc", "")
        self.env["FNM_MULTISHELL_PATH"] = str(self.home / "inherited-fnm")
        for mode in ("1", ""):
            self.env["CURSOR_AGENT"] = mode
            with self.subTest(cursor_agent=mode):
                result = self.shell(r"""
if source "$MODULE"; then return 1; else assert_eq "$?" 7; fi
[[ -z ${deferred:-} ]] || eval "$deferred"
assert_eq "$PATH" "$HOME/direnv/bin:$HOME/bin"
assert_eq "$FNM_MULTISHELL_PATH" "$HOME/inherited-fnm"
assert_eq "${_setup_fnm_initialized:-}" ''
assert_eq "$(node --version)" direnv-node
cd "$HOME/node-project"
assert_eq "$(node --version)" direnv-node
assert_eq "${chpwd_functions[*]}" '_direnv_hook _fnm_post_direnv_hook'
print 'PASS: env returned status 7; direnv works; inherited fnm state was not used'
""")
                self.assertIn("env failed", result.stderr)
        self.assertEqual((self.home / "fnm-calls").read_text(), "env\nenv\n")

    def test_real_env_failure_and_recovery_in_same_shell(self):
        self.real_fnm()
        self.real_direnv()
        Path(self.env["XDG_STATE_HOME"]).write_text("not a directory")
        for mode in ("1", ""):
            self.env["CURSOR_AGENT"] = mode
            with self.subTest(cursor_agent=mode):
                result = self.shell(
                    r"""
if source "$MODULE"; then return 1; else print -r -- "fnm initialization status=$?"; fi
[[ -z ${deferred:-} ]] || eval "$deferred"
assert_eq "$(node --version)" direnv-node
assert_eq "${FNM_MULTISHELL_PATH:-}" ''
assert_eq "${_setup_fnm_initialized:-}" ''
cd "$HOME/node-project"
assert_eq "$(node --version)" direnv-node
export XDG_STATE_HOME="$HOME/recovered-state"
source "$MODULE"
[[ -z ${deferred:-} ]] || eval "$deferred"
assert_eq "$(node --version)" v22.1.0
original=$FNM_MULTISHELL_PATH
source "$MODULE"
[[ -z ${deferred:-} ]] || eval "$deferred"
assert_eq "$FNM_MULTISHELL_PATH" "$original"
cd "$HOME/nvm-project"
assert_eq "$(node --version)" v20.1.0
cd "$HOME/plain"
assert_eq "$(node --version)" v20.1.0
assert_eq "${chpwd_functions[*]}" '_direnv_hook _fnm_post_direnv_hook'
snapshot
cd "$HOME/direnv-project"
assert_eq "$(node --version)" direnv-node
""",
                    "direnv-project",
                )
                self.assertIn("Can't create the symlink for multishells", result.stderr)

    def test_uninstalled_version_reports_failure_without_downloading(self):
        self.real_fnm()
        self.write(self.home / "missing/.node-version", "99.0.0\n")
        result = self.shell(
            r"""
if source "$MODULE"; then return 1; fi
assert_eq "$(node --version)" v20.1.0
cd "$HOME/node-project"
assert_eq "$(node --version)" v22.1.0
snapshot
""",
            "missing",
        )
        self.assertIn("not currently installed", result.stderr)
        self.assertFalse((self.home / ".fnm/node-versions/v99.0.0").exists())

    def test_real_direnv_exports(self):
        self.real_fnm()
        self.real_direnv()
        for mode in ("1", ""):
            self.env["CURSOR_AGENT"] = mode
            with self.subTest(cursor_agent=mode):
                self.shell(
                    r"""
direnv version
source "$MODULE"
[[ -z ${deferred:-} ]] || eval "$deferred"
assert_eq "$(node --version)" v22.1.0
_direnv_hook
assert_eq "$(node --version)" v22.1.0
source "$MODULE"
[[ -z ${deferred:-} ]] || eval "$deferred"
assert_eq "${chpwd_functions[*]}" '_direnv_hook _fnm_post_direnv_hook'
cd "$HOME/nvm-project"
assert_eq "$(node --version)" v20.1.0
_direnv_hook
assert_eq "$(node --version)" v20.1.0
cd "$HOME/plain"
assert_eq "$(node --version)" v20.1.0
cd "$HOME/node-project"
assert_eq "$(node --version)" v22.1.0
snapshot
""",
                    "node-project",
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
