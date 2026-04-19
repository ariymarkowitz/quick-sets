# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Quick Sets — a browser-based single-player implementation of the card game SET. Built with Svelte 5 + Vite, deployed to GitHub Pages.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the built output
- `npm run deploy` — build and publish `dist/` to the `gh-pages` branch (also `scripts/sync-gh-pages.sh`)

There is no test suite, linter, or type checker configured.

## Architecture

The app is a single-page Svelte 5 component tree mounted from [src/main.js](src/main.js) into [index.html](index.html). The root [src/App.svelte](src/App.svelte) composes `Header`, `CardGrid`, `GameOverModal`, and `SvgDefs`.

State and game flow live in [src/lib/stores.js](src/lib/stores.js) — this is the single source of truth. All other components read from its writable/derived stores (`deck`, `board`, `setsFound`, `elapsed`, `gameActive`, `animating`, `toast`, `scores`, `gameOver`) and call exported actions (`newGame`, `handleCardClick`, `toggleThemeAction`). Components do not mutate game state directly.

Key invariants in [stores.js](src/lib/stores.js):

- Each board slot is an `entry { id, card, status }` where `status` is one of `null | 'dealing' | 'selected' | 'valid' | 'invalid' | 'removing'`. `id` is a monotonic counter; cards are referenced by `id`, not index, so animations survive concurrent board mutations.
- The `animating` flag serializes set-validation/replenishment animations. Clicks made during animation are buffered in `selectedIds` and re-checked via `checkPendingSelection` when animation finishes.
- `checkGameState` is the central post-animation hook: it tops the board up to `MIN_BOARD`, calls `reshuffleAndDeal` when no set exists on the current board (combining board + deck and re-dealing), and ends the game when no set exists in board ∪ deck.

Pure game logic (deck generation, `isValidSet`, `hasSet`, `formatTime`) is in [src/lib/game.js](src/lib/game.js). Animation timings and board sizes are in [src/lib/constants.js](src/lib/constants.js) along with SVG shape path data and the color palette consumed by [SvgDefs.svelte](src/components/SvgDefs.svelte). Local-storage persistence (top-5 scores, theme) lives in [src/lib/storage.js](src/lib/storage.js).

Card visuals are rendered via SVG `<symbol>` definitions emitted once by [SvgDefs.svelte](src/components/SvgDefs.svelte) and `<use>`-referenced from [Card.svelte](src/components/Card.svelte); striped fills use SVG `<pattern>` defs keyed by color.
