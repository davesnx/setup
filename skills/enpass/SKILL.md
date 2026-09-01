---
name: enpass
description: Use on macOS when the user asks to list local Enpass credential titles, retrieve or copy an Enpass password, or provide an Enpass secret to a command. Uses the safe local `enpass` wrapper and prevents broad substring matches or password exposure in agent output. Never invokes Enpass binaries on Linux.
---

# Enpass

Use the local `enpass` command instead of calling `enpass-cli` directly. The
wrapper limits access to credential titles and exact-title password lookup.

## Platform Check

Confirm the operating system before running a command. On Linux, do not invoke
`enpass` or `enpass-cli`. Stop and explain that this skill's local Enpass
integration is available only on macOS.

## Safety

Treat `enpass get` output as a secret. Do not let it appear in tool output,
assistant messages, logs, command arguments, or files. Do not use upstream
`show`, `pass`, write, trash, or delete commands.

Only retrieve a password when the user explicitly asks for it or when an
authorized command needs it. Listing titles is safe and can be shown to the
user.

## List Titles

Run:

```sh
enpass list
```

Use the returned spelling and capitalization as the exact title for later
operations. If several titles look plausible, ask the user which one they mean.

## Retrieve Safely

To put a password on the user's clipboard without exposing it to the agent:

```sh
enpass get "Exact Title" | pbcopy
```

To provide a password to one authorized command, retrieve and consume it in the
same shell process:

```sh
SECRET="$(enpass get "Exact Title")" command-that-needs-it
```

Make sure the receiving command does not print its environment or enable shell
tracing. Unset or discard the shell variable as soon as the command finishes.

If the user asks for a command that prints the password, return the command for
them to run instead of executing it through an agent tool:

```sh
enpass get "Exact Title"
```

Relay wrapper errors as written. They are designed to omit secret values and to
explain missing titles, close matches, duplicate titles, empty password fields,
and unlock configuration failures.
