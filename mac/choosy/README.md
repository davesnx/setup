# Choosy

Saved browser rules and preferences, without the license key, update history, or window positions. The rules include workplace URLs; review them before publishing this directory.

## Restore

Quit Choosy, then run from the setup repository:

```sh
DOTFILES_PATH="$PWD" sh mac/choosy/install.sh
```

This is deliberately separate from the main installer so routine setup does not overwrite changes made in Choosy. It copies the rules, imports the saved preferences, and backs up existing settings under the setup backup directory printed by the command. It does not read, copy, or replace `~/Library/Application Support/Choosy/.key`.

The empty `supportPath` values in the templates are filled with the current user's Brave support directory. Brave must be installed at `/Applications/Brave Browser.app`. Create or migrate the matching profiles first: `Profile 1` is personal, `Profile 2` is work, and `Profile 3` is also in the browser picker. Profile directory names may differ on another Mac; check `brave://version` in each profile and adjust the templates if needed.

Reopen Choosy and set it as your default browser in macOS. Login-item permissions may need to be granted again.

## Updating

This is a Git-managed snapshot, not live two-way sync. After changing settings in Choosy, update these templates explicitly. Preserve empty `supportPath` values so another user's home path is not embedded. Keep the license file out of the repository and transfer it privately.
