"""Launch one real OpenCode attempt with a private home and an exact skill catalog."""

import json
import os
import pwd
import signal
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

BUILTIN_SKILLS = ["customize-opencode"]
PROVIDER_KEYS = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "google": "GOOGLE_GENERATIVE_AI_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
}


def isolated_env(source, home, config, provider=None):
    env = {
        key: value
        for key, value in source.items()
        if key in {"PATH", "LANG", "LC_ALL", "TERM", "SSL_CERT_FILE", "NODE_EXTRA_CA_CERTS"}
        or key == PROVIDER_KEYS.get(provider)
    }
    env.update(
        {
            "HOME": str(home),
            "XDG_CONFIG_HOME": str(home / "config"),
            "XDG_DATA_HOME": str(home / "data"),
            "XDG_CACHE_HOME": str(home / "cache"),
            "XDG_STATE_HOME": str(home / "state"),
            "OPENCODE_CONFIG_CONTENT": json.dumps(config),
            "OPENCODE_DISABLE_PROJECT_CONFIG": "1",
            "OPENCODE_DISABLE_EXTERNAL_SKILLS": "1",
            "OPENCODE_DISABLE_CLAUDE_CODE_SKILLS": "1",
            "OPENCODE_DISABLE_DEFAULT_PLUGINS": "1",
            "OPENCODE_PURE": "1",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": os.devnull,
        }
    )
    return env


def provider_auth(records, provider):
    entry = records.get(provider)
    if entry is None:
        return {}
    if entry.get("type") not in {"api", "oauth"}:
        raise ValueError("The pilot supports API/OAuth credentials, not remote-config login")
    return {provider: entry}


def reject_managed_configuration():
    paths = [Path("/etc/opencode")]
    if sys.platform == "darwin":
        username = pwd.getpwuid(os.getuid()).pw_name
        paths = [
            Path("/Library/Application Support/opencode"),
            Path("/Library/Managed Preferences/ai.opencode.managed.plist"),
            Path(f"/Library/Managed Preferences/{username}/ai.opencode.managed.plist"),
        ]
    if any(path.exists() for path in paths):
        raise ValueError("Managed OpenCode configuration is present; use an isolated test host")


def validate_effective_config(config):
    for key in [
        "instructions",
        "agent",
        "mode",
        "command",
        "mcp",
        "plugin",
        "plugin_origins",
        "references",
        "provider",
    ]:
        if config.get(key):
            raise ValueError(f"Unexpected inherited OpenCode configuration: {key}")


def configuration(paths):
    return {
        "$schema": "https://opencode.ai/config.json",
        "skills": {"paths": paths},
        "autoupdate": False,
        "share": "disabled",
        "permission": {
            "external_directory": {"*": "deny", **{f"{p}/**": "allow" for p in paths}},
        },
    }


def main():
    real = os.environ["SKILL_EVALS_OPENCODE"]
    args = sys.argv[1:]
    if args == ["--version"]:
        return subprocess.call([real, *args])
    if not args or args[0] != "run" or "--session" in args:
        raise ValueError("The pilot supports fresh, single-request OpenCode runs only")
    reject_managed_configuration()
    provider = args[args.index("-m") + 1].split("/", 1)[0]
    cwd = Path(args[args.index("--dir") + 1]).resolve()
    inherited = json.loads(os.environ.get("OPENCODE_CONFIG_CONTENT", "{}"))
    paths = inherited.get("skills", {}).get("paths", [])
    bundle_root = Path(os.environ["SKILL_EVALS_BUNDLES"]).resolve()
    for path in paths:
        if not Path(path).resolve().is_relative_to(bundle_root):
            raise ValueError(f"Skill path is outside prepared bundles: {path}")
    expected = sorted(
        [*BUILTIN_SKILLS, *(p.parent.name for path in paths for p in Path(path).glob("*/SKILL.md"))]
    )
    if len(expected) != len(set(expected)):
        raise ValueError("Duplicate skills in prepared catalog")
    audit = {
        "workspace": str(cwd),
        "skill_paths": paths,
        "expected_skills": expected,
        "catalog_verified": False,
        "configuration_verified": False,
    }
    audit_path = Path(os.environ["SKILL_EVALS_AUDIT"]) / f"{uuid.uuid4().hex}.json"
    with tempfile.TemporaryDirectory(prefix="setup-skill-eval-home-") as directory:
        home = Path(directory)
        env = isolated_env(os.environ, home, configuration(paths), provider)
        auth = Path(os.environ["SKILL_EVALS_AUTH"])
        if auth.is_file():
            target = home / "data/opencode/auth.json"
            target.parent.mkdir(parents=True)
            target.write_text(json.dumps(provider_auth(json.loads(auth.read_text()), provider)))
            target.chmod(0o600)
        try:
            # OpenCode can exit before flushing a large debug payload to a pipe.
            # A regular file avoids truncating the skill catalog around 64 KiB.
            with tempfile.TemporaryFile(mode="w+") as output:
                subprocess.run(
                    [real, "debug", "config", "--pure"],
                    cwd=cwd,
                    env=env,
                    stdout=output,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=45,
                    check=True,
                )
                output.seek(0)
                validate_effective_config(json.load(output))
                audit["configuration_verified"] = True
                output.seek(0)
                output.truncate()
                subprocess.run(
                    [real, "debug", "skill", "--pure"],
                    cwd=cwd,
                    env=env,
                    stdout=output,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=45,
                    check=True,
                )
                output.seek(0)
                actual = sorted(skill["name"] for skill in json.load(output))
            audit.update({"actual_skills": actual, "catalog_verified": actual == expected})
            if actual != expected:
                raise ValueError(f"Catalog mismatch: expected {expected}, got {actual}")
            # The adapter owns the process group and timeout. Keeping the binary in
            # that group also lets it reap OpenCode's server child on cancellation.
            code = subprocess.call([real, *args], cwd=cwd, env=env)
            audit["exit_code"] = code
            return code
        finally:
            audit_path.write_text(json.dumps(audit, indent=2) + "\n")


if __name__ == "__main__":

    def terminate(_signum, _frame):
        raise SystemExit(143)

    signal.signal(signal.SIGTERM, terminate)
    sys.exit(main())
