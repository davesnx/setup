# Verification record

checks.json is an object with `implementation_moved` (boolean),
`examples_executed` (boolean), and `checks` (array of objects).
Include exactly two checks, named `metadata` and `runtime`. Each has `id`,
`command`, `status` (`passed`, `failed`, or `blocked`), `exit_code`, and
`evidence` (the command's exact trimmed combined output). A missing required
tool is blocked. A tool that runs and rejects its input is failed. The note
must distinguish these checks from the examples' unverified behavior.
