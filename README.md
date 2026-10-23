# Folio

Folio is a self-hosted, web-first media archive for photos and videos. Inspired by self-hosted media managers such as Immich, it pairs a focused gallery experience, library, albums, favorites, places, archive, vault and trash, with a complete backend: local accounts, uploads with automatic thumbnails and EXIF/GPS metadata, storage quotas, a maintenance dashboard, scheduled snapshots, and an installable PWA shell.

## Features

### Gallery

- **Media library** - responsive date-grouped grid (2–6 columns), lazy loading, sticky section headers with collapse chevrons, per-section select-all, and a "No preview" fallback for browser-unsupported formats
- **Search** - filters by title and location in the main grid, albums, and places views
- **Uploads** - multi-file queue with per-file progress and retry; MIME/extension whitelist (JPEG, PNG, WebP, GIF, TIFF, AVIF, HEIC/HEIF, MP4, M4V, MOV, WebM); per-account quota enforcement; HEIC thumbs are converted to JPEG
- **Thumbnails** - 512×512 JPEG previews generated with sharp, cached immutably, generated on demand with job deduplication
- **EXIF & places** - capture date becomes the media date; GPS coordinates are reverse-geocoded (Nominatim) into a city/state/country and power the Places pages (`/places`, `/places/[city]`)
- **Viewer lightbox** - URL-driven (`?photo=id`), keyboard navigation (←/→/Esc), playback of originals with HTTP Range support for video, EXIF info panel (camera, focal length, aperture, ISO…), copy link, rename, favorite, download, add to album, vault, archive, delete
- **Selection mode** - click-select cards plus a sticky bulk toolbar: favorite toggle, download (single file or ZIP), add to album, archive toggle, vault toggle, and trash
- **Albums** - create, rename, delete, cover thumbnails, inline add/remove of items (single or bulk)
- **Archive** - hidden-from-view items with an always-fresh per-user "Download all (.zip)" bundle at `data/archives/<userId>.zip`
- **Vault** - PIN-protected hidden storage: first visit prompts you to set a 4-digit PIN; every visit requires it; 5 failed attempts locks the vault until an admin resets the PIN; an unlock grant lasts 12 hours per session
- **Favorites & trash** - heart toggle anywhere; trash restores items or purges them automatically after the `trash_days` window (default 60 days)

### Accounts

- **First-run bootstrap** - the first `/login` visit creates the administrator account
- **Sessions** - httpOnly cookie sessions with a server-configurable lifetime (1–365 days)
- **Settings page** - storage usage bar, account self-service danger zone (deactivate, delete, clear all data, export/import personal data as ZIP), admin panel for session lifetime and maintenance mode
- **Personal data export/import** - a ZIP containing your media metadata plus all original files, re-importable into this or another Folio account (500 MB import limit; prompt to use the upload section above it)

### Admin dashboard (admins only)

- **Overview** - account, storage, and session cards; maintenance banner; latest accounts
- **User management** - create accounts; activate/deactivate; reset passwords; reset any user's vault PIN (without setting one for them); delete accounts; self and last-admin guardrails
- **Storage** - usage overview, quota setting, server disk-usage breakdown (uploads, thumbnails, database, snapshots, config exports), per-account usage
- **Import / Export** - download the live database or server configuration as JSON; restore a database from an uploaded file (validated, with an automatic pre-restore snapshot); create/download/delete snapshots and config exports
- **Cron jobs** - a 60-second scheduler (`FOLIO_CRON_DISABLED=1` disables it) with two pre-configured jobs: database snapshots and configuration exports (every 120 minutes); run now, pause/resume; jobs also fire on dashboard loads
- **Audit logs** - logins (success/failure), account, media, album, settings, cron, and vault events with filter chips

### PWA

- `public/manifest.webmanifest` for standalone installation
- `public/sw.js` caches the app shell and same-origin GETs (skips `/api/`, `/login`, and Next.js assets)
- Poppins via `next/font`

## Tech stack

- **Next.js 16** (App Router, Turbopack, Cache Components) + **React 19**
- **better-sqlite3** - schema-versioned migrations, WAL mode; the database lives at `folio.db` in the project root
- **sharp** (thumbnails), **exifr** (EXIF/GPS), **heic-convert**, **archiver** + **adm-zip** (ZIP export/import)
- **Tailwind CSS v4** with design tokens (`--color-surface`, `--color-panel`, `--color-line`, `--color-ink`, `--color-muted`, `--color-faint`, `--color-accent-soft`, `--color-ok`, `--color-warning`, `--color-danger` in `src/app/globals.css`)
- **react-hot-toast** + **@tabler/icons-react**
- Plain JavaScript (no TypeScript); `@/*` maps to `./src/*`

## Getting started

### Requirements

- Node.js 20 or newer
- npm

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you will be asked to create the administrator account on first use. Photos, videos, and the database persist to the project folder automatically.

### Production

```bash
npm run build
npm run start
```

A writable filesystem is required for `folio.db` and the `data/` directory. Native dependencies (`better-sqlite3`, `sharp`, `heic-convert`, `archiver`, `adm-zip`) are listed in `serverExternalPackages` in `next.config.mjs`.

### Environment

`.env.local` supports:

| Variable | Purpose |
| --- | --- |
| `PORT` | Overrides the dev/prod server port |
| `FOLIO_CRON_DISABLED` | Set to `1` to disable the background job scheduler |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run thumbs:backfill` | Regenerate missing thumbnails for existing uploads |

## Data layout

```text
folio.db              SQLite database (WAL journal siblings alongside)
data/uploads/         original photo/video files (UUID names)
data/thumbs/          <mediaId>.jpg 512×512 thumbnails
data/archives/        <userId>.zip per-user archive bundles
data/backups/         cron & manual snapshots, pre-restore backups, DB dumps
data/exports/         cron & manual configuration exports (JSON)
```

All of these are git-ignored.

## Project structure

```text
src/
  app/
    (gallery)/           authenticated gallery: media, albums(+[id]), favorites,
                         places(+[city]), archive, trash, vault, people, utilities
    dashboard/           admin: overview, users, storage, import-export, cron jobs, logs
    settings/            account, storage usage, danger zone, site administration
    login/               sign-in + first-run admin bootstrap
    api/
      upload/            POST multi-file upload (quota + MIME checks)
      download/          GET ?ids=… original or ZIP of up to 500 items
      media/[id]         GET original (Range-capable) / thumb / exif routes
      albums/            GET album list for pickers
      archive/download/  GET per-user archive ZIP
      my/export/         GET personal data export ZIP
      admin/…            admin-only DB, config, snapshot, and export downloads
  components/            media grid/viewer, gallery chrome, vault gate, modals, toasts…
  lib/                   db, auth, actions, uploads, archive, cron, storage,
                         geocode, format
scripts/
  backfill-thumbs.cjs    thumbnail backfill CLI
public/
  manifest.webmanifest   PWA manifest
  sw.js                  service worker (app-shell cache)
  icon.png
```

## Database

SQLite via better-sqlite3 with a `user_version`-tracked schema (currently v4). Tables: `users` (incl. `active`, `vault_pin_hash`, `vault_attempts`), `sessions`, `settings`, `events`, `media` (incl. `favorite`, `archived`, `vaulted`, `trashed`, `est_location/city/district/state/country`), `albums`, `album_media`, and `cron_jobs`. New columns are applied idempotently at startup; `validateDatabaseFile()` and `swapDatabaseFile()` support integrity-checked, snapshot-backed restores without a restart.

Default settings: `maintenance: off`, `session_days: 30`, `quota_gb: 15`, `trash_days: 60`.

## Validation

Before shipping changes, run:

```bash
npm run lint
npm run build
```

## License

MIT - see [LICENSE](LICENSE).
