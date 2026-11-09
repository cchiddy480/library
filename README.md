# Library

A personal index of learn-something sites. Static, no build, no dependencies.

Live: https://cchiddy480.github.io/library/ — repo `cchiddy480/library`, Pages from `main` / root.
Push to `main` = deploy.

Files: `index.html`, `styles.css`, `app.js`, `data.js`. All paths are relative, so it works
from `file://` and under the Pages project path.
Scripts are classic (no ES modules) because `file://` blocks them.

## Run

    python3 -m http.server   # then open http://localhost:8000/   (or just open index.html)

## Add entries

Edit `data.js` (seed, committed) or use **+ ADD** (saved to this browser's `localStorage`).
Local entries are tagged `LOCAL`; **EXPORT JSON** copies seed + local as a JSON array to paste back into `data.js`.

## Storage — be honest

Pins, recents, notes and local entries live in `localStorage` for **this browser and this origin only**.
`file://`, `localhost` and the Pages URL are separate origins; phone and desktop are separate too. Nothing syncs.
If storage is blocked, the app keeps working read-only and shows a banner.

## Keys

`/` search · `↓` from search to first result · `↑ ↓ j k` between titles · `Enter` open · `Esc` clear search / close note / blur.

## Pages caching

After pushing, the Pages CDN can serve stale `app.js`/`data.js` for a few minutes; hard-reload if changes don't appear.


## Secret

Type `index` with focus outside any field.
