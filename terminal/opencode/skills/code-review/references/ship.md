# Authorized Follow-Through

Read this only when the user asks for action after review, such as fixes,
committing, pushing, or opening or updating a PR. The review's findings are
input to that action, not authority to perform it.

1. Complete the review and verify blockers before changing source. Fix only
   confirmed issues within the authorized edit scope. A request to commit,
   push, or create a PR does not by itself authorize source fixes. If a blocker
   needs an unrequested action, report it and ask for that authority.
2. Preserve unrelated user changes. Run repository-required format, lint,
   typecheck, build, and relevant tests against the final edited state. Rerun
   affected checks after a fix; earlier results do not prove the new state.
3. Load `github` Commit mode before an authorized commit. Stage only intended
   files, honor the repository's check requirements, and do not bypass hooks.
4. Push, create or update a PR, or post review comments only when the request
   authorizes that action. Use the applicable publishing workflow.
5. Report the verified findings, authorized changes, check results, and PR URL
   when one exists. State any blocker that prevented the requested action.
