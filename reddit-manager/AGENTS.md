# AGENT — reddit-subscription-manager

## Overview
Browser userscript for export, import, and bulk management of Reddit subscriptions, posts, comments, and account deletion redirect. Features a 3-cell live dashboard (Subreddits, Posts, Comments) and Pause / Cancel controls.

## Structure
- `src/api.ts` — Handles Reddit REST API calls (subs, user items, deletions, modhash authentication).
- `src/portability.ts` — Core logic for batch operations, progress reporting, user confirmation, post/comment deletion, pause/resume state handling, and export/import parsing.
- `src/panel.ts` — Shadow Root UI component with 3-cell readout grid, action sheet (`ACTIONS`), and Pause/Cancel controls.
- `src/index.ts` — Userscript entry point.
- `tests/` — Vitest unit tests for api, panel, and portability functions.

## Conventions
- UI operates inside a Shadow DOM to isolate styles from Reddit's stylesheet.
- Destruction operations (`leave`, `deletePosts`, `deleteComments`, `deleteAccount`) require explicit typed count confirmation or confirmation dialog.

## Dependencies & Setup
- Built with Vite + `vite-plugin-monkey` target userscript output.
- Testing executed via `bun run vitest run` or `npx vitest run`.

## Critical Information
- Reddit limits user item listings to 1,000 items per request endpoint (`/user/{username}/submitted.json`, `comments.json`).
- Pre-deletion overwrite (`POST /api/editusertext`) before `POST /api/del` ensures text privacy on Reddit/archives.
- Account deletion requires plain text password verification on Reddit's backend; userscript redirects to `https://old.reddit.com/prefs/delete/`.

## Blunders
- `bun test` fails due to global `location` undefined in Node context; use `bun run vitest run` which initializes happy-dom environment correctly.
