# Enpass

A read-only interface over
[`hazcod/enpass-cli`](https://github.com/hazcod/enpass-cli). It lists credential
titles and gets one password by its exact title.

## Configure unlocking

The setup Brewfile installs `enpass-cli` and `jq`. The default vault is:

```text
~/Documents/Enpass/Vaults/primary
```

Save a separate Enpass CLI PIN in the macOS login Keychain. The command prompts
for the value, so it does not enter shell history:

```sh
security add-generic-password \
  -U \
  -a "$USER" \
  -s enpass-cli-primary \
  -l "Enpass CLI PIN" \
  -w
```

Initialize the encrypted unlock cache. This prompts for the Enpass master
password once:

```sh
ENP_PIN="$(security find-generic-password \
  -a "$USER" \
  -s enpass-cli-primary \
  -w)" \
  enpass-cli \
  -vault "$HOME/Documents/Enpass/Vaults/primary" \
  -pin \
  dryrun
```

The CLI PIN and Enpass master password are not stored in this repository.

Start a new shell so `enpass/bin` is on `PATH`.

## Use the CLI

List every Login and Password title:

```sh
enpass list
```

Print the password for one exact, case-sensitive title:

```sh
enpass get "GitHub"
```

`get` writes the password to standard output. To avoid terminal output, send it
directly to the clipboard:

```sh
enpass get "GitHub" | pbcopy
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `ENPASS_VAULT` | Override the vault directory |
| `ENPASS_KEYFILE` | Set an Enpass keyfile path |
| `ENPASS_KEYCHAIN_SERVICE` | Override the macOS Keychain service name |
| `ENPASS_CLI_BIN` | Override the upstream executable, mainly for tests |
| `ENP_PIN` | Supply the CLI PIN without Keychain lookup |
| `ENPASS_DEBUG=1` | Include safe upstream errors when vault listing fails |

## Tests

The tests use a fake vault adapter and contain no real credentials:

```sh
bats enpass/test/enpass.bats
```
