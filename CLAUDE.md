# CLAUDE.md

Quick Sets — browser-based single-player SET card game. Svelte 5 + Vite + TypeScript, deployed to GitHub Pages.

## Commands

- `npm run dev` / `build` / `preview` / `check` / `deploy`
- No test suite or linter.

## Reactive architecture

Before writing or restructuring reactive code ($state/$derived/$effect, classes that own effects, cross-component lifecycles), read [agent/reactive-architecture.md](agent/reactive-architecture.md). Core idea: scopes own lifetime, effects are transient attachments; prefer `$derived` over effect-that-assigns; effects that set up external resources must return cleanup; reactive modules (classes or factory functions with effects) take getter props.

## Project architecture

[src/App.svelte](src/App.svelte) composes `Header`, `CardGrid`, `GameOverModal`, `MenuModal`, `SvgDefs`, `Toast`.

**State** lives in [src/lib/app-state.svelte.ts](src/lib/app-state.svelte.ts) (app-level scope) and [src/lib/Game.svelte.ts](src/lib/Game.svelte.ts) (game-level scope). Components read reactively and call exported actions; they never mutate state directly. Actions: `newGame`, `handleCardClick`, `openMenu`, `closeMenu`, `useHint`, `devSkipToEnd`.

Key invariants:
- `BoardEntry { id, card }` holds persistent identity (monotonic `id`) decoupled from transient view state. Per-card view is computed by `game.cardStatus(entry)` returning `{ transition, highlight }` — `transition: null | { type: 'dealing' | 'removing', delay }`, `highlight: null | 'selected' | 'hint' | 'valid' | 'invalid'`. A `card: null` entry keeps layout when the deck is empty.
- `phase: Phase` is a discriminated union (`'intro' | 'playing' | 'pausedMenu' | 'pausedTab' | 'over'`) — the single source of truth for lifecycle. Derived: `running`, `paused`, `menuOpen`, `cardsShown`, `gameActive`, `gameOver`.
- `resolution: Resolution` is a discriminated union (`null | flash | removing | dealing`) driving the flash → remove → deal pipeline. A single `$effect` watches `resolution`, schedules one timeout per stage, and transitions. `animating` is derived from `resolution !== null` and gates user input.
- Hints: each `useHint()` call increments `hintRevealed` up to `hintIds.length`. Any click clears the preview. Using hints sets `hintsUsed`, disqualifying the score.
- `checkBoard()` runs after dealing: tops up to `MIN_BOARD`, reshuffles via `refresh()` when no set exists on board, ends the game when board ∪ deck has no set.
- Transitions are state-driven: child owns the animation and fires a done callback; parent never times the child. (1) `pendingAction: 'newGame' | 'resumePlay' | null` drives modal exit — hides modal via `canShowModal`; Modal fires `onclose` after exit animation, then `onModalClosed` commits. (2) `cardsExiting: boolean` is the card-grid analogue — App sets it, CardGrid counts `animationend`s and fires `onCardsExited`.
- Tab-visibility auto-pauses via the `pausedTab` phase. Timer lives in [timer.svelte.ts](src/lib/timer.svelte.ts); `timePaused` is derived and passed in so the timer pauses for intro/over/paused phases.
- `animSettings` is `$derived` from `MODE_TIMINGS[mode]` — all timings change with `'chill'`/`'speedy'` mode.

[MenuModal.svelte](src/components/MenuModal.svelte) — multi-view modal (main/help/leaderboard), wraps [Modal.svelte](src/components/Modal.svelte) (animated primitive, `open` prop, fires `onclose` after exit animation).

Other modules: [game-utils.ts](src/lib/game.ts) — pure logic (`isValidSet`, `hasSet`, `findSet`, `formatTime`). [constants.ts](src/lib/constants.ts) — timings, board sizes, `MODE_TIMINGS`, SVG paths/colors. [storage.ts](src/lib/storage.ts) — localStorage for top-5 scores, theme, mode.

Card visuals: SVG `<symbol>` defs in [SvgDefs.svelte](src/components/SvgDefs.svelte), `<use>`-referenced from [Card.svelte](src/components/Card.svelte); striped fills via `<pattern>` defs keyed by color.