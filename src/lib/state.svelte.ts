import { untrack } from 'svelte';
import { generateDeck, shuffle, isValidSet, hasSet, findSet, type Card } from './game.js';
import { saveScore as persistScore, getScores, getMode, setMode } from './storage.js';
import { INITIAL_BOARD as BOARD_SIZE, MIN_BOARD, DEAL_SETTLE_MS, TOAST_MS, MODE_TIMINGS, VICTORY_MESSAGES } from './constants.js';
import { createTimer, type Timer } from './timer.svelte.js';

export type EntryTransition =
  | null
  | {type: 'dealing', delay: number}
  | {type: 'removing', delay: number}

export type Highlight = null | 'selected' | 'hint' | 'valid' | 'invalid';

export type BoardEntry = {
  id: number;
  card: Card | null;
};

export type EntryView = {
  transition: EntryTransition;
  highlight: Highlight;
};

export type GameOverInfo = {
  title: string;
  time: number;
  currentIdx: number;
  disqualified: boolean;
};

export type GameMode = 'chill' | 'speedy';

// Discriminated union driving the flash → remove → deal pipeline.
type Resolution =
  | null
  | { stage: 'flash'; ids: number[]; valid: boolean }
  | { stage: 'removing'; ids: number[]; stagger: number; next: 'deal' | 'reshuffle' | 'none' }
  | { stage: 'dealing'; ids: number[] };

type Phase =
  | { kind: 'intro' }
  | { kind: 'playing' }
  | { kind: 'pausedMenu' }
  | { kind: 'pausedTab' }
  | { kind: 'over'; info: GameOverInfo };

class GameState {
  // --- Root state ---
  deck: Card[] = $state([]);
  board: BoardEntry[] = $state([]);
  setsFound: number = $state(0);
  hintsUsed: boolean = $state(false);

  // Interaction
  selectedIds: number[] = $state([]);
  hintIds: number[] = $state([]);
  hintRevealed: number = $state(0);

  // Pipeline
  resolution: Resolution = $state(null);

  // Timing
  timer: Timer = $state(createTimer(() => this.timePaused));

  // Phase
  phase: Phase = $state({ kind: 'intro' });

  // App
  mode: GameMode = $state('chill');
  scores: number[] = $state([]);
  toast: string = $state('');

  viewTransition: 'cardsExiting' | 'modalExiting' | null = $state(null);

  // --- Derivations ---
  animSettings = $derived(MODE_TIMINGS[this.mode]);
  // `gameActive`: a game is in progress (playing or paused — not intro, not over).
  // UI uses this to decide whether to show Resume/Restart vs Start.
  gameActive = $derived(
    this.phase.kind === 'playing' ||
    this.phase.kind === 'pausedMenu' ||
    this.phase.kind === 'pausedTab'
  );
  // `running`: game is actively tickable — used by internal action guards so
  // clicks/hints don't fire during pause or over/intro.
  running = $derived(this.phase.kind === 'playing');
  paused = $derived(this.phase.kind === 'pausedMenu' || this.phase.kind === 'pausedTab');
  timePaused = $derived(this.paused || this.phase.kind === 'intro' || this.phase.kind === 'over');
  menuOpen = $derived(this.phase.kind === 'intro' || this.phase.kind === 'pausedMenu');
  gameOver = $derived<GameOverInfo | null>(this.phase.kind === 'over' ? this.phase.info : null);
  modalOpen = $derived(
    this.phase.kind === 'intro' || this.phase.kind === 'pausedMenu' || this.phase.kind === 'over'
  );
  cardsShown = $derived(this.phase.kind === 'playing' || this.phase.kind === 'pausedTab');
  cardsMounted = $derived(this.cardsShown || this.viewTransition === 'cardsExiting');
  animating = $derived(this.resolution !== null);
  activeEntries = $derived(this.board.filter(e => e.card !== null));

  modalVisible = $derived(this.modalOpen && this.viewTransition === null);

  // Per-entry view. Replaces the mutated `entry.status` / delays.
  cardStatus(entry: BoardEntry): EntryView {
    const r = this.resolution;
    let transition: EntryTransition = null;
    let highlight: Highlight = null;

    const rId = r?.ids.indexOf(entry.id) ?? -1;

    if (this.viewTransition === 'cardsExiting') {
      const idx = this.activeEntries.findIndex(e => e.id === entry.id);
      const removeDelay = Math.max(0, idx * this.animSettings.fastStagger);
      transition = { type: 'removing', delay: removeDelay };
    } else if (r?.stage === 'removing' && rId >= 0) {
      transition = { type: 'removing', delay: rId * r.stagger };
    } else if (r?.stage === 'dealing' && rId >= 0) {
      transition = { type: 'dealing', delay: rId * this.animSettings.stagger };
    }

    if (r?.stage === 'flash' && rId >= 0) {
      highlight = r.valid ? 'valid' : 'invalid';
    } else if (this.hintIds.slice(0, this.hintRevealed).includes(entry.id)) {
      highlight = 'hint';
    } else if (this.selectedIds.includes(entry.id)) {
      highlight = 'selected';
    }

    return { transition, highlight };
  }
}

export const game = new GameState();

let nextId = 0;
const makeId = (): number => ++nextId;

function totalRemoveDuration(n: number, stagger: number): number {
  return Math.max(0, n - 1) * stagger + game.animSettings.removeDuration;
}

function totalDealDuration(n: number): number {
  return Math.max(0, n - 1) * game.animSettings.stagger + game.animSettings.dealDuration;
}

function ensureBoardHasSet(cards: Card[], boardSize: number): void {
  const n = Math.min(boardSize, cards.length);
  while (!hasSet(cards.slice(cards.length - n))) {
    shuffle(cards);
  }
}

function findBoardSet(): number[] | null {
  const entries = game.activeEntries;
  const indices = findSet(entries.map(e => e.card!));
  if (!indices) return null;
  return indices.map(i => entries[i]!.id);
}

function makeEntry(card: Card | null): BoardEntry {
  return { id: makeId(), card };
}

// Called when the dealing stage completes. Decides whether to end the game,
// top up the board, reshuffle, or do nothing.
function checkBoard(): void {
  if (!game.running) return;

  const active = game.activeEntries;
  if (active.length === 0 && game.deck.length === 0) {
    endGame();
    return;
  }

  const boardCards = active.map(e => e.card!);
  if (hasSet(boardCards)) return;

  if (!hasSet([...boardCards, ...game.deck])) {
    endGame();
    return;
  }

  refresh();
}

function refresh(): void {
  game.toast = 'No sets here — reshuffling…';
  const combined: Card[] = [...game.activeEntries.map(e => e.card!), ...game.deck];
  ensureBoardHasSet(combined, BOARD_SIZE);
  game.deck = combined;
  game.selectedIds = [];

  const ids = game.board.map(e => e.id);
  game.resolution = { stage: 'removing', ids, stagger: game.animSettings.stagger, next: 'reshuffle' };
}

function topUp(target: number): void {
  const ids: number[] = [];
  for (const e of game.board) {
    if (e.card !== null) continue;
    if (game.deck.length === 0) break;
    e.card = game.deck.pop()!;
    ids.push(e.id);
  }
  while (game.activeEntries.length < target && game.deck.length > 0) {
    const e = makeEntry(game.deck.pop()!);
    game.board.push(e);
    ids.push(e.id);
  }
  if (ids.length > 0) game.resolution = { stage: 'dealing', ids };
}

function dealFreshBoard(): void {
  game.board = [];
  topUp(BOARD_SIZE);
}

function endGame(): void {
  const elapsedValue = game.timer.sample;
  const title = VICTORY_MESSAGES[Math.floor(Math.random() * VICTORY_MESSAGES.length)]!;
  const disqualified = game.hintsUsed;
  const scores = disqualified ? getScores() : persistScore(elapsedValue);
  const currentIdx = disqualified ? -1 : scores.indexOf(elapsedValue);
  game.scores = scores;
  game.phase = { kind: 'over', info: { title, time: elapsedValue, currentIdx, disqualified } };
}

// --- Scope C: modal close handshake ---
let closeResolver: (() => void) | null = null;

function closeModal(): Promise<void> {
  if (!game.modalOpen) return Promise.resolve();
  game.viewTransition = 'modalExiting';
  return new Promise(res => { closeResolver = res; });
}

// Invoked by the Modal components when their exit animation ends.
export function onModalClosed(): void {
  const r = closeResolver;
  closeResolver = null;
  r?.();
}

// --- Scope A: app-lifetime effects ---
$effect.root(() => {
  game.scores = getScores();
  game.mode = getMode();

  // Resolution — unified flash→remove→deal state machine. One effect,
  // one cleanup, one timer at a time. Each stage transition re-runs the
  // effect so the prior timeout is cleared via cleanup.
  $effect(() => {
    const r = game.resolution;
    if (!r) return;

    let d: number;
    if (r.stage === 'flash') {
      d = r.valid ? game.animSettings.validFlash : game.animSettings.invalidFlash;
    } else if (r.stage === 'removing') {
      d = totalRemoveDuration(r.ids.length, r.stagger);
    } else {
      d = totalDealDuration(r.ids.length) + DEAL_SETTLE_MS;
    }

    const timerId = setTimeout(() => {
      if (r.stage === 'flash') {
        if (r.valid) {
          game.setsFound += 1;
          game.selectedIds = [];
          game.resolution = {
            stage: 'removing',
            ids: r.ids,
            stagger: game.animSettings.stagger,
            next: 'deal',
          };
        } else {
          game.selectedIds = game.selectedIds.filter(x => !r.ids.includes(x));
          game.toast = 'Not a set!';
          game.resolution = null;
        }
      } else if (r.stage === 'removing') {
        if (r.next === 'reshuffle') {
          dealFreshBoard();
        } else {
          for (const e of game.board) if (r.ids.includes(e.id)) e.card = null;
          topUp(MIN_BOARD);
          if (game.resolution === null) checkBoard();
        }
      } else {
        game.resolution = null;
        checkBoard();
      }
    }, d);

    return () => clearTimeout(timerId);
  });

  // ToastAutoDismiss
  $effect(() => {
    if (!game.toast) return;
    const id = setTimeout(() => { game.toast = ''; }, TOAST_MS);
    return () => clearTimeout(id);
  });

  // VisibilityListener — pause the game when the tab hides, resume when back.
  $effect(() => {
    const onChange = () => {
      if (game.phase.kind === 'playing' && document.hidden) {
        game.phase = { kind: 'pausedTab' };
      } else if (game.phase.kind === 'pausedTab' && !document.hidden) {
        game.phase = { kind: 'playing' };
      }
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  });

  $effect(() => setMode(game.mode));

  // ModalExiting auto-clear — once modalOpen goes false (phase change resolved),
  // clear the modalExiting transition so modalVisible can recompute cleanly.
  $effect.pre(() => {
    if (!game.modalOpen && game.viewTransition === 'modalExiting') {
      game.viewTransition = null;
    }
  });

  // CardsExiting — when `cardsShown` flips false while cards are mounted,
  // run the staggered outro animation, then unmount by clearing the flag.
  $effect.pre(() => {
    if (game.cardsShown) return;
    const { count, duration } = untrack(() => {
      const count = game.activeEntries.length;
      return {
        count,
        duration: totalRemoveDuration(count, game.animSettings.fastStagger),
      };
    });
    if (count === 0) return;
    game.viewTransition = 'cardsExiting';
    const id = setTimeout(() => { game.viewTransition = null; }, duration);
    return () => {
      clearTimeout(id);
      game.viewTransition = null;
    };
  });

});

// --- Actions ---

export function handleCardClick(id: number): void {
  if (!game.running || game.resolution) return;

  const entry = game.board.find(e => e.id === id);
  if (!entry || entry.card === null) return;

  // Any click clears the hint preview.
  game.hintIds = [];
  game.hintRevealed = 0;

  if (game.selectedIds.includes(id)) {
    game.selectedIds = game.selectedIds.filter(x => x !== id);
    return;
  }

  const nextSelected = [...game.selectedIds, id];
  game.selectedIds = nextSelected;

  if (nextSelected.length === 3) {
    const [a, b, c] = nextSelected.map(sid => game.board.find(e => e.id === sid)!) as [BoardEntry, BoardEntry, BoardEntry];
    const valid = isValidSet(a.card!, b.card!, c.card!);
    game.resolution = { stage: 'flash', ids: nextSelected, valid };
  }
}

export function useHint(): void {
  if (!game.running || game.resolution?.stage === 'flash') return;

  game.hintsUsed = true;

  if (game.hintIds.length === 0) {
    const ids = findBoardSet();
    if (!ids) return;
    game.selectedIds = [];
    game.hintIds = ids;
    game.hintRevealed = 0;
  }

  if (game.hintRevealed < game.hintIds.length) {
    game.hintRevealed += 1;
  }
}

export async function newGame(): Promise<void> {
  await closeModal();
  // Reset root signals.
  game.setsFound = 0;
  game.selectedIds = [];
  game.hintIds = [];
  game.hintRevealed = 0;
  game.hintsUsed = false;
  game.resolution = null;
  game.toast = '';
  game.timer = createTimer(() => game.paused);

  game.deck = generateDeck();
  ensureBoardHasSet(game.deck, BOARD_SIZE);
  dealFreshBoard();

  game.phase = { kind: 'playing' };
}

export function openMenu(): void {
  if (game.phase.kind === 'playing') {
    game.phase = { kind: 'pausedMenu' };
  }
}

export async function closeMenu(): Promise<void> {
  if (game.phase.kind !== 'pausedMenu' || game.viewTransition !== null) return;
  await closeModal();
  game.phase = { kind: 'playing' };
  game.resolution = { stage: 'dealing', ids: game.activeEntries.map(e => e.id) };
}

export function devSkipToEnd(): void {
  if (!game.running) return;
  game.deck = [];
  game.board = [];
  game.selectedIds = [];
  game.resolution = null;
  endGame();
}
