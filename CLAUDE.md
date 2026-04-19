# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Quick Sets — a browser-based single-player implementation of the card game SET. Built with Svelte 5 + Vite + TypeScript, deployed to GitHub Pages.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the built output
- `npm run check` — run `svelte-check` (TypeScript type-checker)
- `npm run deploy` — build and publish `dist/` to the `gh-pages` branch (also `scripts/sync-gh-pages.sh`)

There is no test suite or linter configured.

## Architecture

The app is a single-page Svelte 5 component tree mounted from [src/main.ts](src/main.ts) into [index.html](index.html). The root [src/App.svelte](src/App.svelte) composes `Header`, `CardGrid`, `GameOverModal`, `Toast`, and `SvgDefs`.

State and game flow live in [src/lib/state.svelte.ts](src/lib/state.svelte.ts) — this is the single source of truth. State is a single Svelte 5 `$state` object (`game: GameState`) exported directly; components read its properties reactively and call exported actions (`newGame`, `handleCardClick`, `devAutoMatch`, `devSkipToEnd`). Components do not mutate game state directly.

Key invariants in [state.svelte.ts](src/lib/state.svelte.ts):

- Each board slot is a `BoardEntry { id, card, status }` where `status` is one of `null | 'dealing' | 'selected' | 'valid' | 'invalid' | 'removing' | 'placeholder'`. `id` is a monotonic counter; cards are referenced by `id`, not index, so animations survive concurrent board mutations. `'placeholder'` slots appear when the deck is exhausted but a set was just removed — cards stay in place rather than collapsing.
- The `animating` flag serializes set-validation/replenishment animations. Clicks made during animation are buffered in `selectedIds` and re-checked via `checkPendingSelection` when animation finishes.
- `checkGameState` is the central post-animation hook: it tops the board up to `MIN_BOARD`, calls `reshuffleAndDeal` when no set exists on the current board (combining board + deck and re-dealing), and ends the game when no set exists in board ∪ deck.

Pure game logic (deck generation, `isValidSet`, `hasSet`, `findSet`, `formatTime`) is in [src/lib/game.ts](src/lib/game.ts). Animation timings and board sizes are in [src/lib/constants.ts](src/lib/constants.ts) along with SVG shape path data and the color palette consumed by [SvgDefs.svelte](src/components/SvgDefs.svelte). Local-storage persistence (top-5 scores, theme) lives in [src/lib/storage.ts](src/lib/storage.ts). The `bodyClass` Svelte action (syncs a class onto `document.body`) is in [src/lib/actions.ts](src/lib/actions.ts).

Card visuals are rendered via SVG `<symbol>` definitions emitted once by [SvgDefs.svelte](src/components/SvgDefs.svelte) and `<use>`-referenced from [Card.svelte](src/components/Card.svelte); striped fills use SVG `<pattern>` defs keyed by color.
