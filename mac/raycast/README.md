# Raycast

[Installed extensions checklist](https://gist.github.com/davesnx/5fd30171e2cf47abc9c1cb85487e1641) for setting up another Mac.

The checklist does not include settings, hotkeys, or credentials. To migrate those, use Raycast's Export Settings & Data and Import Settings & Data commands, and transfer the export privately.

## Kill All Processes

With Node.js and npm installed, run from `mac/raycast/kill-all-processes`:

```sh
npm ci
npm run dev
```

Once the build finishes, **Kill All Processes** appears in Raycast. Stop the development watcher with Ctrl-C; the command remains installed. Repeat these steps to update it after changing the source.

## Open Brave Agent

In Raycast Settings → Script Commands → Script Folders, add this repository's `mac/raycast` directory. On older Raycast versions, use Settings → Extensions → + → Add Script Directory.

Search Raycast for **Open Brave Agent**. Aliases and hotkeys can be assigned in Raycast settings.
