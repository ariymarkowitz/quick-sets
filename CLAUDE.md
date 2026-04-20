# CLAUDE.md

Quick Sets — browser-based single-player SET card game. Svelte 5 + Vite + TypeScript, deployed to GitHub Pages.

## Commands

- `npm run dev` / `build` / `preview` / `check` / `deploy`
- No test suite or linter.

## Guidelines

Prefer reusable components. Use Svelte 5 runes (not stores); prefer derived state and effects over cached values, especially with nested reactive structures.

## Architecture

[src/App.svelte](src/App.svelte) composes `Header`, `CardGrid`, `GameOverModal`, `MenuModal`, `SvgDefs`.

**State** lives entirely in [src/lib/state.svelte.ts](src/lib/state.svelte.ts) as a `GameState` class instance (`game`) with `$state` fields. Components read reactively and call exported actions; they never mutate state directly. Actions: `newGame`, `handleCardClick`, `openMenu`, `closeMenu`, `useHint`, `devAutoMatch`, `devSkipToEnd`.

Key invariants:
- `BoardEntry { id, card, status, dealDelay, removeDelay }` — `status`: `null | 'dealing' | 'selected' | 'valid' | 'invalid' | 'removing' | 'placeholder' | 'hint'`. `id` is monotonic so animations survive concurrent mutations. `'placeholder'` keeps layout when deck is empty; `'hint'` highlights a valid set (sets `hintsUsed`, disqualifying the score).
- `animating` serializes animations; buffered clicks in `selectedIds` are replayed via `checkPendingSelection`.
- `checkGameState` tops up the board to `MIN_BOARD`, reshuffles when no set exists, ends the game when board ∪ deck has no set.
- Modal transitions: `hideCardsThenShowModal` animates cards out then opens modal; `hideModalThenRun` stores action in `pendingAction` and closes modal first.
- `menuOpen`/`paused`/`cardsVisible`/`modalVisible` coordinate menu ↔ game. Pause adjusts `gameStartTime` on resume.
- `animSettings` is `$derived` from `MODE_TIMINGS[mode]` — all timings change with `'chill'`/`'speedy'` mode.

[MenuModal.svelte](src/components/MenuModal.svelte) — multi-view modal (main/help/leaderboard), wraps [Modal.svelte](src/components/Modal.svelte) (animated primitive, `open` prop, fires `onclose` after exit animation).

Other modules: [game.ts](src/lib/game.ts) — pure logic (`isValidSet`, `hasSet`, `findSet`, `formatTime`). [constants.ts](src/lib/constants.ts) — timings, board sizes, `MODE_TIMINGS`, SVG paths/colors. [storage.ts](src/lib/storage.ts) — localStorage for top-5 scores, theme, mode. [actions.ts](src/lib/actions.ts) — `bodyClass` Svelte action.

Card visuals: SVG `<symbol>` defs in [SvgDefs.svelte](src/components/SvgDefs.svelte), `<use>`-referenced from [Card.svelte](src/components/Card.svelte); striped fills via `<pattern>` defs keyed by color.
