# CLAUDE.md

Quick Sets — browser-based single-player SET card game. Svelte 5 + Vite + TypeScript, deployed to GitHub Pages.

## Commands

- `npm run dev` / `build` / `preview` / `check` / `deploy`
- No test suite or linter.

## Reactive architecture

Before writing or restructuring reactive code ($state/$derived/$effect, classes that own effects, cross-component lifecycles), read [agent/reactive-architecture.md](agent/reactive-architecture.md). Core idea: scopes own lifetime, effects are transient attachments; prefer `$derived` over effect-that-assigns; effects that set up external resources must return cleanup; reactive modules (classes or factory functions with effects) take getter props.

## Project architecture

[src/App.svelte](src/App.svelte) composes `Header`, `CardGrid`, `GameOverModal`, `MenuModal`, `SvgDefs`. (`Toast` is rendered inside `Header`.) App.svelte owns the cross-component lifecycle: instantiating `Game`, the `pendingAction` transition machine, the visibility listener, and writing animation CSS variables.

**State** is split across two scopes:
- [src/lib/AppState.svelte.ts](src/lib/AppState.svelte.ts) — singleton `app` (long-lived; app-level UI lifecycle).
- [src/lib/Game.svelte.ts](src/lib/Game.svelte.ts) — `Game` class instantiated by App.svelte for each new game; its scope is the game's lifetime. The current instance is held at `app.game` (`Game | null`).

App.svelte creates a new `Game` whenever `gameCounter` increments, passing getter deps `{ getRunning, getCardsExiting, getAnimSettings, onEndGame }`. The `$effect` returns a cleanup that nulls `app.game`, so the previous instance and its effects are torn down. Components read state reactively from `app` / `app.game` and call methods directly (e.g. `app.game?.handleCardClick(id)`); they never mutate state. App.svelte owns `newGame` / `openMenu` / `closeMenu`; `Game` owns `handleCardClick`, `useHint`, `devSkipToEnd`, `triggerResumeDeal`.

Key invariants:
- `Phase` is a discriminated union on `kind`: `{ kind: 'intro' | 'playing' | 'pausedMenu' | 'pausedTab' } | { kind: 'over', info: GameOverInfo }` — the single source of truth for lifecycle. Derived on `app`: `running`, `paused`, `gameActive`, `menuOpen`, `cardsShown`, `cardsMounted`, `gameOver` (`GameOverInfo | null`), `canShowModal`.
- `BoardEntry { id, card }` holds persistent identity (monotonic `id`) decoupled from transient view state. Per-card view is computed by `game.cardStatus(entry)` returning `{ transition, highlight }` — `transition: null | { type: 'dealing' | 'removing', delay }`, `highlight: null | 'selected' | 'hint' | 'valid' | 'invalid'`. A `card: null` entry keeps the slot in the board while the deck drains.
- `Game.resolution` is a discriminated union (`null | flash | removing | dealing`) driving the flash → remove → deal pipeline. A single `$effect` in `Game` watches `resolution`, schedules one timeout per stage, and transitions on completion. `Game.animating` is derived from `resolution !== null` and gates user input.
- Hints: each `useHint()` call increments `hintRevealed` up to `hintIds.length`. Any click clears the preview. Using hints sets `hintsUsed`, disqualifying the score.
- `#checkBoard()` runs after dealing: tops up to `MIN_BOARD`, reshuffles via `#refresh()` when no set exists on board, ends the game when board ∪ deck has no set. End delivers `{ time, disqualified }` through the `onEndGame` dep, which transitions phase to `over`.
- Transitions are state-driven: child owns the animation and fires a done callback; parent never times the child. (1) `app.pendingAction: 'newGame' | 'resumePlay' | null` plus `app.cardsExiting` plus a local `modalAnimating` in App.svelte gate a single commit `$effect` — modal visibility uses `canShowModal`, and `Modal` fires `onClose` after its exit animation. (2) `app.cardsExiting` is the card-grid analogue: a `$effect.pre` in App sets it when `cardsShown` falls, and `CardGrid` counts `animationend`s before calling `onCardsExited`. `cardsMounted = cardsShown || cardsExiting` keeps cards in the DOM until exit completes.
- Resume after a menu pause re-runs the deal animation: App.svelte's commit effect calls `app.game?.triggerResumeDeal()`, which sets `resolution = { stage: 'dealing', ids: activeEntries }`.
- Tab-visibility auto-pauses via the `pausedTab` phase (App.svelte registers the `visibilitychange` listener). The timer lives in [src/lib/timer.svelte.ts](src/lib/timer.svelte.ts); `Game` constructs it with `() => !deps.getRunning()` so it pauses for intro/over/paused phases.
- `app.animSettings` is `$derived` from `MODE_TIMINGS[mode]` — all timings change with `'chill'` / `'speedy'` mode. App.svelte mirrors the durations into CSS variables (`--deal-duration`, `--remove-duration`, `--shake-duration`).

[MenuModal.svelte](src/components/MenuModal.svelte) — multi-view modal (main/help/leaderboard), wraps [Modal.svelte](src/components/Modal.svelte) (animated primitive, `open` prop, fires `onClose` after exit animation).

Other modules: [src/lib/game-utils.ts](src/lib/game-utils.ts) — pure logic (`isValidSet`, `hasSet`, `findSet`, `formatTime`). [src/lib/constants.ts](src/lib/constants.ts) — timings, board sizes, `MODE_TIMINGS`, SVG paths/colors. [src/lib/storage.ts](src/lib/storage.ts) — localStorage for top-5 scores, theme, mode.

Card visuals: SVG `<symbol>` defs in [src/components/SvgDefs.svelte](src/components/SvgDefs.svelte), `<use>`-referenced from [src/components/Card.svelte](src/components/Card.svelte); striped fills via `<pattern>` defs keyed by color.
