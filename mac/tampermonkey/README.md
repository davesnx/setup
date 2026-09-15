# Tampermonkey

Userscripts and Advanced-mode settings for the David and Ahrefs Brave profiles.

## Scripts

| Script | Upstream |
| --- | --- |
| Google Hit Hider by Domain | [Greasy Fork](https://greasyfork.org/en/scripts/1682-google-hit-hider-by-domain-search-filter-block-sites) |
| Image Max URL | [qsniyg/maxurl](https://github.com/qsniyg/maxurl) (upstream-recommended development userscript) |
| General URL Cleaner | [Greasy Fork](https://greasyfork.org/en/scripts/10096-general-url-cleaner) |
| YouTube Direct Downloader | [Greasy Fork](https://greasyfork.org/en/scripts/481954-youtube-direct-downloader) |
| Assassinate Ad Block Blockers | [Greasy Fork](https://greasyfork.org/en/scripts/382482-assassinate-ad-block-blockers) |

The files in `scripts/` are upstream snapshots with signed example-URL comments
containing AWS access key IDs removed. Executable code, author, license, and
userscript metadata remain intact; each script retains its upstream license.
Download locations are recorded in `sources.json`.

## Install or restore

From the repository root, using Bun:

```sh
bun install --cwd mac/tampermonkey --frozen-lockfile
bun mac/tampermonkey/manage.ts bundle
```

In **each Brave profile**:

1. Install [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
2. Open `brave://extensions/?id=dhdgffkkebhmkfjojejmpbldmpobfkfo` and enable
   **Allow User Scripts**. Older Chromium versions may require Developer mode instead.
3. Open **Tampermonkey → Dashboard → Utilities → Import from file** and choose
   `mac/tampermonkey/dist/tampermonkey.zip`.
4. Select the five scripts, then confirm the import.
5. Set **Settings → Config mode → Advanced** and verify that the scripts are enabled.

The bundle enables the scripts and disables their automatic upstream update checks
so installed versions follow this repository. `settings.json` records the desired
`configMode` of `100` (Advanced). Apply that setting through the dashboard: importing
a partial global-settings file resets other Tampermonkey preferences.
Tampermonkey fetches any external `@require` or `@resource` dependencies at installation.
The generated ZIP is ignored by Git and can be rebuilt offline from the snapshots.

Google Hit Hider replaces W3Schools Hider. On a Google results page, use its **block**
button to add `w3schools.com`, or manage the list through **Manage Hiding**.

## Update and share between machines

```sh
bun mac/tampermonkey/manage.ts update
git diff -- mac/tampermonkey/scripts
bun mac/tampermonkey/manage.ts bundle
```

The updater downloads and validates all five scripts before replacing the snapshots.
Review and commit the updated sources, then import the rebuilt ZIP in both profiles.
On another machine, pull the repository, run `bundle`, and import it there too.
This is explicit Git-based distribution, rather than automatic two-way browser sync.

Script storage (including Google Hit Hider's custom blocklist) is separate from script
source and isn't included in this bundle. Transfer that blocklist with Hit Hider's
export/import controls. Keep full Tampermonkey backups containing personal script
storage or cloud credentials outside this repository.

## Checks

The tool and tests use strict TypeScript, including checked indexed access and
exact optional property types. From the repository root:

```sh
bun run --cwd mac/tampermonkey typecheck
bun run --cwd mac/tampermonkey test
```
