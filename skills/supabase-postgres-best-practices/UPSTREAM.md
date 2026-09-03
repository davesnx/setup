# Upstream source

- Repository: https://github.com/supabase/agent-skills
- Source: https://github.com/supabase/agent-skills (skills/supabase-postgres-best-practices/SKILL.md)
- Revision: not recorded (installed skill-folder hash per `/home/me/.agents/.skill-lock.json`: `27bde25111c4cd5e6f803fc9db5fbffe27bb26cf`; frontmatter metadata records package version `1.1.1`)
- Vendored: August 18, 2026
- License: MIT

`SKILL.md` and its `references/` and `CHANGELOG.md` were vendored from upstream.

Local changes (2026-09-03): shortened the frontmatter `description` from an exhaustive trigger list to a summary under 400 characters, keeping schema design, migrations, RLS, indexes, functions, pgvector, pg_cron, and the slow-query/locking/connection diagnosis triggers.
