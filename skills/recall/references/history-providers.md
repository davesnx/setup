# History Providers

Use the first providers available for the requested workspace and time window. Never search another workspace unless the user asks. Exclude the active conversation and child, subagent, evaluation, and test sessions.

Search for candidate conversations first. Read full text only for the small candidate set that matches the topic.

## OpenCode

OpenCode stores history in `~/.local/share/opencode/opencode.db`. Query it read-only with Python's `sqlite3` module or the `sqlite3` CLI.

The relevant tables are:

- `session`: `id`, `project_id`, `parent_id`, `directory`, `title`, `time_created`, `time_updated`.
- `part`: `session_id`, `message_id`, `time_created`, `data`.

`part.data` is JSON. Use only rows where `json_extract(data, '$.type') = 'text'`, and read `json_extract(data, '$.text')`.

### Find Candidates

Use a parameterized query. Bind the active workspace path, the start time in Unix milliseconds, and a `%topic%` pattern. Do not concatenate user text into SQL.

```sql
SELECT DISTINCT
  s.id,
  s.title,
  s.time_updated
FROM session AS s
JOIN part AS p ON p.session_id = s.id
WHERE s.directory = ?
  AND s.parent_id IS NULL
  AND s.time_updated >= ?
  AND json_valid(p.data)
  AND json_extract(p.data, '$.type') = 'text'
  AND (
    s.title LIKE ?
    OR json_extract(p.data, '$.text') LIKE ?
  )
ORDER BY s.time_updated DESC
LIMIT 12;
```

For activity recall without a topic, omit the final text predicate and select recent root sessions by `time_updated`.

Exclude the active session ID when the host exposes it. Otherwise discard a candidate only when its title, timestamps, and content clearly identify the conversation now in progress.

### Read Candidates

Bind the selected session IDs with one placeholder per ID:

```sql
SELECT
  s.id AS session_id,
  s.title,
  p.time_created,
  json_extract(p.data, '$.text') AS text
FROM session AS s
JOIN part AS p ON p.session_id = s.id
WHERE s.id IN (?, ...)
  AND json_valid(p.data)
  AND json_extract(p.data, '$.type') = 'text'
ORDER BY s.time_updated DESC, p.time_created ASC;
```

Group rows by `session_id`. Cite the session ID for every conclusion taken from the transcript.

## Cursor

Cursor transcripts live at `~/.cursor/projects/<slug>/agent-transcripts/<uuid>/<uuid>.jsonl`. Build `<slug>` from the absolute workspace path by dropping the leading slash and replacing each remaining slash with a hyphen.

Order transcript directories by real modification time, not UUID. Search for the topic first, then read only matching conversations and relevant regions. Each line is one message. Cite the transcript UUID.

## Other Hosts

Use a host-provided session search or history tool when available. Apply the same workspace, time-window, active-session, candidate-first, and citation rules. Do not infer a storage path for an unknown host.
