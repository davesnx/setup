# VS Code and Cursor

`mac/install.sh` links `settings.json` and `keybindings.json` into both editors.

For Cursor only, it also links `projects.json` to
`~/Library/Application Support/Cursor/User/globalStorage/alefragnani.project-manager/projects.json`.
It creates the parent directory if needed and replaces an existing file or
symlink, as it does for the editor settings. After installation, changes saved
by Cursor's Project Manager update the repository file.
