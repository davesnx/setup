# Reviewer API

`createReviewer(config, io)` returns `launch(parent, agentName, sessionRules)`.
Launch returns `{read(path), done}` immediately. `done` resolves to the output
of `io.review(read)` without writing to parent.history. The caller may continue
using the parent before the review finishes. A denied read throws an Error
whose code is `DENIED`. Do not call io.read or io.ask on denial.

Rules are objects from exact resource names or `*` to `allow`, `ask`, or `deny`.
Within one layer, exact takes precedence over `*`. An omitted rule is `allow`.
Across config.global, config.agents[agentName], and sessionRules, any deny or
ask prevents automatic reading. io.read is the only resource access boundary.
No model or host API is required. The shared config stays mutable: another
plugin may replace an agent's rules between factory creation, launch, and read.
Global and session restrictions must still apply in those cases.
