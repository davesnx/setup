# Vendored agent integrations

Keep third-party plugin and skill source inside this setup repository. Fork or
vendor integrations here; global configuration folders should only link to the
source in setup.

## i-have-adhd

- Upstream: https://github.com/ayghri/i-have-adhd
- Revision: `0a84de401019a3a822248df586d88a2b56f8c6af`
- License: MIT; see `i-have-adhd/LICENSE`.

The vendored files are the upstream `skills/i-have-adhd` directory, OpenCode
plugin and command, and license. OpenCode loads the plugin through its linked
`vendor` directory. Claude Code uses the `i-have-adhd` plugin enabled in
`terminal/claude/settings.json`, not this copy.

Restart the tools, then run `/i-have-adhd`. Say `normal mode` to stop using the
style for that session.

To update, import these same paths from a reviewed upstream revision and update
the revision above.
