import { untrack } from 'svelte';
import { generateDeck, shuffle, isValidSet, hasSet, findSet, type Card } from './game-utils.js';
import { INITIAL_BOARD as BOARD_SIZE, MIN_BOARD, DEAL_SETTLE_MS, TOAST_MS, MODE_TIMINGS } from './constants.js';
import { createTimer } from './timer.svelte.js';

export type EntryTransition =
  | null
  | { type: 'dealing'; delay: number }
  | { type: 'removing'; delay: number };

export type Highlight = null | 'selected' | 'hint' | 'valid' | 'invalid';

export type BoardEntry = {
  id: number;
  card: Card | null;
};

export type EntryStatus = {
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

export type AnimSettings = typeof MODE_TIMINGS[GameMode];

type Resolution =
  | null
  | { stage: 'flash'; ids: number[]; valid: boolean }
  | { stage: 'removing'; ids: number[]; stagger: number; next: 'deal' | 'reshuffle' | 'none' }
  | { stage: 'dealing'; ids: number[] };

export type GameDeps = {
  getRunning: () => boolean;
  getCardsExiting: () => boolean;
  getAnimSettings: () => AnimSettings;
  onEndGame: (result: { time: number; disqualified: boolean }) => void;
};

let nextId = 0;
const makeId = (): number => ++nextId;

export class Game {
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

  toast: string = $state('');

  timer = createTimer(() => !this.#deps.getRunning());

  activeEntries = $derived(this.board.filter(e => e.card !== null));
  animating = $derived(this.resolution !== null);

  #deps: GameDeps;

  constructor(deps: GameDeps) {
    this.#deps = deps;

    $effect(() => {
      const r = this.resolution;
      if (!r) return;

      const animSettings = this.#deps.getAnimSettings();
      let timeoutId: number;

      if (r.stage === 'flash' && r.valid) {
        timeoutId = setTimeout(() => {
            this.setsFound += 1;
            this.selectedIds = [];
            this.resolution = {
              stage: 'removing',
              ids: r.ids,
              stagger: this.#deps.getAnimSettings().stagger,
              next: 'deal',
            }
        }, r.valid ? animSettings.validFlash : animSettings.invalidFlash);
      } else if (r.stage === 'flash' && !r.valid) {
        this.toast = 'Not a set!';
        timeoutId = setTimeout(() => {
          this.selectedIds = this.selectedIds.filter(x => !r.ids.includes(x));
          this.resolution = null;
        }, animSettings.invalidFlash);
      } else if (r.stage === 'removing') {
        timeoutId = setTimeout(() => {
          if (r.next === 'reshuffle') {
            this.#dealFreshBoard();
          } else {
            for (const e of this.board) if (r.ids.includes(e.id)) e.card = null;
            this.#topUp(MIN_BOARD);
            if (this.resolution === null) this.#checkBoard();
          }
        }, this.#totalRemoveDuration(r.ids.length, r.stagger));
      } else {
        timeoutId = setTimeout(() => {
          this.resolution = null;
          this.#checkBoard();
        }, this.#totalDealDuration(r.ids.length) + DEAL_SETTLE_MS);
      }
      return () => clearTimeout(timeoutId);
    });

    $effect(() => {
      if (!this.toast) return;
      const id = setTimeout(() => { this.toast = ''; }, TOAST_MS);
      return () => clearTimeout(id);
    });

    untrack(() => {
      this.deck = generateDeck();
      this.#ensureBoardHasSet(this.deck, BOARD_SIZE);
      this.#dealFreshBoard();
    });
  }

  cardStatus(entry: BoardEntry): EntryStatus {
    const r = this.resolution;
    const animSettings = this.#deps.getAnimSettings();
    const cardsExiting = this.#deps.getCardsExiting();
    let transition: EntryTransition = null;
    let highlight: Highlight = null;

    const rId = r?.ids.indexOf(entry.id) ?? -1;

    if (cardsExiting) {
      const idx = this.activeEntries.findIndex(e => e.id === entry.id);
      const removeDelay = Math.max(0, idx * animSettings.fastStagger);
      transition = { type: 'removing', delay: removeDelay };
    } else if (r?.stage === 'removing' && rId >= 0) {
      transition = { type: 'removing', delay: rId * r.stagger };
    } else if (r?.stage === 'dealing' && rId >= 0) {
      transition = { type: 'dealing', delay: rId * animSettings.stagger };
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

  triggerResumeDeal(): void {
    this.resolution = { stage: 'dealing', ids: this.activeEntries.map(e => e.id) };
  }

  // --- Actions ---

  handleCardClick(id: number): void {
    if (!this.#deps.getRunning() || this.resolution) return;

    const entry = this.board.find(e => e.id === id);
    if (!entry || entry.card === null) return;

    // Any click clears the hint preview.
    this.hintIds = [];
    this.hintRevealed = 0;

    if (this.selectedIds.includes(id)) {
      this.selectedIds = this.selectedIds.filter(x => x !== id);
      return;
    }

    const nextSelected = [...this.selectedIds, id];
    this.selectedIds = nextSelected;

    if (nextSelected.length === 3) {
      const [a, b, c] = nextSelected.map(sid => this.board.find(e => e.id === sid)!) as [BoardEntry, BoardEntry, BoardEntry];
      const valid = isValidSet(a.card!, b.card!, c.card!);
      this.resolution = { stage: 'flash', ids: nextSelected, valid };
    }
  }

  useHint(): void {
    if (!this.#deps.getRunning() || this.resolution) return;

    this.hintsUsed = true;

    if (this.hintIds.length === 0) {
      const ids = this.#findBoardSet();
      if (!ids) return;
      this.selectedIds = [];
      this.hintIds = ids;
      this.hintRevealed = 0;
    }

    if (this.hintRevealed < this.hintIds.length) {
      this.hintRevealed += 1;
    }
  }

  devSkipToEnd(): void {
    if (!this.#deps.getRunning()) return;
    this.deck = [];
    this.board = [];
    this.selectedIds = [];
    this.resolution = null;
    this.#endGame();
  }

  // --- Private helpers ---

  #totalRemoveDuration(n: number, stagger: number): number {
    return Math.max(0, n - 1) * stagger + this.#deps.getAnimSettings().removeDuration;
  }

  #totalDealDuration(n: number): number {
    const animSettings = this.#deps.getAnimSettings();
    return Math.max(0, n - 1) * animSettings.stagger + animSettings.dealDuration;
  }

  #ensureBoardHasSet(cards: Card[], boardSize: number): void {
    const n = Math.min(boardSize, cards.length);
    while (!hasSet(cards.slice(cards.length - n))) {
      shuffle(cards);
    }
  }

  #findBoardSet(): number[] | null {
    const entries = this.activeEntries;
    const indices = findSet(entries.map(e => e.card!));
    if (!indices) return null;
    return indices.map(i => entries[i]!.id);
  }

  #makeEntry(card: Card | null): BoardEntry {
    return { id: makeId(), card };
  }

  #checkBoard(): void {
    if (!this.#deps.getRunning()) return;

    const active = this.activeEntries;
    if (active.length === 0 && this.deck.length === 0) {
      this.#endGame();
      return;
    }

    const boardCards = active.map(e => e.card!);
    if (hasSet(boardCards)) return;

    if (!hasSet([...boardCards, ...this.deck])) {
      this.#endGame();
      return;
    }

    this.#refresh();
  }

  #refresh(): void {
    this.toast = 'No sets here — reshuffling…';
    const combined: Card[] = [...this.activeEntries.map(e => e.card!), ...this.deck];
    this.#ensureBoardHasSet(combined, BOARD_SIZE);
    this.deck = combined;
    this.selectedIds = [];

    const ids = this.board.map(e => e.id);
    this.resolution = { stage: 'removing', ids, stagger: this.#deps.getAnimSettings().stagger, next: 'reshuffle' };
  }

  #topUp(target: number): void {
    const ids: number[] = [];
    for (const e of this.board) {
      if (e.card !== null) continue;
      if (this.deck.length === 0) break;
      e.card = this.deck.pop()!;
      ids.push(e.id);
    }
    while (this.activeEntries.length < target && this.deck.length > 0) {
      const e = this.#makeEntry(this.deck.pop()!);
      this.board.push(e);
      ids.push(e.id);
    }
    if (ids.length > 0) this.resolution = { stage: 'dealing', ids };
    else this.resolution = null;
  }

  #dealFreshBoard(): void {
    this.board = [];
    this.#topUp(BOARD_SIZE);
  }

  #endGame(): void {
    const time = this.timer.sample;
    const disqualified = this.hintsUsed;
    this.#deps.onEndGame({ time, disqualified });
  }
}
