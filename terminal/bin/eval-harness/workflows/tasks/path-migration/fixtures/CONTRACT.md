# Local migration

`node migrate.cjs DESTINATION` updates the fixture in the current directory.
The destination is a relative directory here. Reject paths outside this fixture.
Require DESTINATION/tool.txt to exist before changing active state.

active.json owns the active dotfiles root, editor project list, and service
server/session roots. startup.json is a JSON object with the active setupRoot
and an unrelated editor setting. Update only setupRoot in that object. Preserve
all other properties and their values, including editor: "fixture-editor".
The only managed link is home/tool. Do not change other links.
Keep unrelated active.json entries unchanged. Keep source files and
history/session.json byte-for-byte.
The two destination trees already exist and contain the same managed tool.
Do not copy, remove, rename, commit, or push a real repository.
