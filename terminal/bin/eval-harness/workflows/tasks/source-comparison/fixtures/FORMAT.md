# Facts format

Write a JSON array. Each entry has `topic`, `value`, `source`, and `quote`.
Topics: `script_precedence`, `restoration`, `upstream_existing_file`,
`local_existing_file`. Use one entry for each. Values respectively come from:
`framework|user`, `every-install|once`, `overwrite|backup|refuse`, and
`overwrite|backup|refuse`. Source is a relative file path. Quote is an exact,
nonempty single line from that source which supports the value. Put reasoning,
the documentation disagreement, and tradeoffs in comparison.md, not the JSON.
