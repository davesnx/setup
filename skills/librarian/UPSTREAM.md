# Upstream source

- Repository: https://github.com/mitsuhiko/agent-stuff
- Source: https://github.com/mitsuhiko/agent-stuff/tree/main/skills/librarian
- Revision: `a571b86f70fed288fb9419fe5f6171f48b66a402`
- Vendored: September 5, 2026
- License: Apache-2.0 (see `LICENSE`)

`SKILL.md` and `checkout.sh` are copied from upstream.

Local changes: use `~/.librarian/<host>/<org>/<repo>` as the default checkout path in the script, help text, and skill instructions. Keep the `LIBRARIAN_CACHE_ROOT` override. Clarify that `checkout.sh` is relative to the skill directory. Use plain text for the path pattern in the description so it passes the local skill validator. Reject malformed repository names and cache-path traversal, propagate parser failures, and reject symlinked checkout parents.
