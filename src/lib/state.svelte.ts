import { generateDeck, shuffle, isValidSet, hasSet, findSet, type Card } from './game.js';
import { saveScore as persistScore, getScores, getMode, setMode } from './storage.js';
import { INITIAL_BOARD, MIN_BOARD, DEAL_SETTLE_MS, TOAST_MS, MODE_TIMINGS, VICTORY_MESSAGES } from './constants.js';

export type EntryStatus =
  | null
  | 'dealing'
  | 'selected'
  | 'valid'
  | 'invalid'
  | 'removing'
  | 'placeholder'
  | 'hint';

export type BoardEntry = {
  id: number;
  card: Card | null;
  status: EntryStatus;
  dealDelay: number;
  removeDelay: number;
};

export type GameOverInfo = {
  title: string;
  time: number;
  currentIdx: number;
  disqualified: boolean;
};

export type GameMode = 'chill' | 'speedy';

class GameState {
  deck: Card[] = $state([]);
  board: BoardEntry[] = $state([]);
  setsFound: number = $state(0);
  elapsed: number = $state(0);
  gameActive: boolean = $state(false);
  animating: boolean = $state(false);
  toast: string = $state('');
  scores: number[] = $state([]);
  gameOver: GameOverInfo | null = $state(null);
  menuOpen: boolean = $state(true);
  mode: GameMode = $state('chill');
  paused: boolean = $state(false);
  cardsVisible: boolean = $state(false);
  modalVisible: boolean = $state(true);
  pendingAction: (() => void) | null = $state(null);
  hintsUsed: boolean = $state(false);
  hintIds: number[] = $state([]);
  hintRevealCount: number = $state(0);
  animSettings = $derived(MODE_TIMINGS[this.mode]);
  activeEntries = $derived(this.board.filter(e => e.status !== 'placeholder'));
}

export const game = new GameState();

let nextId = 0;
const makeId = (): number => ++nextId;

let gameStartTime = 0;
let pauseStart = 0;
let selectedIds: number[] = [];
let visibilityPaused = false;

$effect.root(() => {
  game.scores = getScores();
  game.mode = getMode();

  $effect(() => {
    if (!game.gameActive || game.paused) return;
    const id = setInterval(() => {
      game.elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    }, 1000);
    return () => clearInterval(id);
  });

  $effect(() => {
    if (!game.toast) return;
    const id = setTimeout(() => { game.toast = ''; }, TOAST_MS);
    return () => clearTimeout(id);
  });

  $effect(() => { setMode(game.mode); });

  function onVisibilityChange() {
    if (!game.gameActive || game.menuOpen) return;
    if (document.hidden) {
      if (!game.paused) {
        pauseStart = Date.now();
        game.paused = true;
        visibilityPaused = true;
      }
    } else {
      if (visibilityPaused && game.paused) {
        gameStartTime += Date.now() - pauseStart;
        game.paused = false;
        visibilityPaused = false;
      }
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => document.removeEventListener('visibilitychange', onVisibilityChange);
});

function setStatusFor(ids: number[], status: EntryStatus): void {
  for (const e of game.board) {
    if (ids.includes(e.id)) e.status = status;
  }
}

function findBoardSet(): number[] | null {
  const entries = game.board.filter(
    e => e.status !== 'removing' && e.status !== 'dealing' && e.status !== 'placeholder' && e.card !== null,
  );
  const indices = findSet(entries.map(e => e.card as Card));
  if (!indices) return null;
  return indices.map(i => entries[i]!.id);
}

function dealCards(n: number): BoardEntry[] {
  const count = Math.min(n, game.deck.length);
  if (count <= 0) return [];

  const newEntries: BoardEntry[] = [];
  for (let i = 0; i < count; i++) {
    const card = game.deck.pop()!;
    newEntries.push({ id: makeId(), card, status: 'dealing', dealDelay: 0, removeDelay: 0 });
  }
  staggerDealDelays(newEntries);
  game.board.push(...newEntries);
  scheduleDealClears(newEntries);
  return newEntries;
}

function tryValidateSelection(): void {
  const existingIds = new Set(game.board.map(e => e.id));
  selectedIds = selectedIds.filter(id => existingIds.has(id));

  if (selectedIds.length < 3 || game.animating) return;
  game.animating = true;

  const entries = selectedIds.map(id => game.board.find(e => e.id === id));
  if (entries.some(e => !e)) {
    selectedIds = [];
    game.animating = false;
    return;
  }
  const [a, b, c] = entries as [BoardEntry, BoardEntry, BoardEntry];
  const ids = [a.id, b.id, c.id];

  if (a.card && b.card && c.card && isValidSet(a.card, b.card, c.card)) {
    setStatusFor(ids, 'valid');
    game.setsFound += 1;
    game.toast = '';
    selectedIds = [];
    setTimeout(() => removeAndReplenish(ids), game.animSettings.validFlash);
  } else {
    setStatusFor(ids, 'invalid');
    selectedIds = [];
    game.toast = 'Not a set!';
    setTimeout(() => {
      for (const e of game.board) { if (ids.includes(e.id) && e.status === 'invalid') e.status = null; }
      game.animating = false;
      tryValidateSelection();
    }, game.animSettings.invalidFlash);
  }
}

function removeAndReplenish(idsToRemove: number[]): void {
  // Mark cards as removing → the {#if} in CardGrid toggles to false → out: transition fires.
  // The grid slot div persists throughout, so no layout shift occurs.
  const toRemove = game.board.filter(e => idsToRemove.includes(e.id));
  staggerRemoveDelays(toRemove);
  for (const e of toRemove) e.status = 'removing';

  setTimeout(() => {
    const replacingEntries: BoardEntry[] = [];
    for (const e of game.board) {
      if (e.status !== 'removing') continue;
      if (game.deck.length > 0) {
        e.card = game.deck.pop()!;
        e.removeDelay = 0;
        e.status = 'dealing';
        replacingEntries.push(e);
      } else {
        e.card = null;
        e.status = 'placeholder';
      }
    }
    staggerDealDelays(replacingEntries);
    scheduleDealClears(replacingEntries);
    game.animating = false;
    tryValidateSelection();
    setTimeout(checkGameState, DEAL_SETTLE_MS);
  }, totalRemoveDuration(idsToRemove.length));
}

function reshuffleAndDeal(): void {
  game.toast = 'No sets here — reshuffling…';
  game.animating = true;

  const combined: Card[] = [
    ...game.activeEntries.map(e => e.card).filter((c): c is Card => c !== null),
    ...game.deck,
  ];
  ensureBoardHasSet(combined, INITIAL_BOARD);
  game.deck = combined;

  // Stagger the exits: set removeDelay then mark all as removing in the same tick
  // so Svelte fires each out: transition with the appropriate delay.
  staggerRemoveDelays(game.board);
  for (const entry of game.board) entry.status = 'removing';
  selectedIds = [];

  setTimeout(() => {
    game.board = [];
    dealCards(INITIAL_BOARD);
    game.animating = false;
    setTimeout(checkGameState, game.animSettings.dealDuration);
  }, totalRemoveDuration(game.board.length));
}

function checkGameState(): void {
  if (!game.gameActive || game.animating) return;

  if (game.activeEntries.length === 0 && game.deck.length === 0) {
    endGame();
    return;
  }

  if (game.activeEntries.length < MIN_BOARD && game.deck.length > 0) {
    dealCards(MIN_BOARD - game.activeEntries.length);
    setTimeout(checkGameState, DEAL_SETTLE_MS);
    return;
  }

  const boardCards = game.activeEntries.map(e => e.card).filter((c): c is Card => c !== null);
  if (hasSet(boardCards)) return;

  if (!hasSet([...boardCards, ...game.deck])) {
    endGame();
    return;
  }

  reshuffleAndDeal();
}

function hideCardsThenShowModal(prepareModal: () => void): void {
  staggerRemoveDelays(game.activeEntries, game.animSettings.fastStagger);
  for (const entry of game.activeEntries) entry.status = 'removing';
  selectedIds = [];
  const outroTotal = totalRemoveDuration(game.activeEntries.length, game.animSettings.fastStagger);
  setTimeout(() => {
    game.cardsVisible = false;
    prepareModal();
    game.modalVisible = true;
  }, outroTotal);
}

function hideModalThenRun(action: () => void): void {
  game.pendingAction = action;
  game.modalVisible = false;
}

function staggerDealDelays(entries: BoardEntry[]): void {
  entries.forEach((entry, i) => { entry.dealDelay = i * game.animSettings.stagger; });
}

function staggerRemoveDelays(entries: BoardEntry[], stagger = game.animSettings.stagger): void {
  entries.forEach((entry, i) => { entry.removeDelay = i * stagger; });
}

function totalRemoveDuration(n: number, stagger = game.animSettings.stagger): number {
  return n * stagger + game.animSettings.removeDuration;
}

function scheduleDealClears(entries: BoardEntry[]): void {
  if (entries.length === 0) return;
  const ids = new Set(entries.map(e => e.id));
  const lastDelay = Math.max(...entries.map(e => e.dealDelay));
  setTimeout(() => {
    for (const e of game.board) {
      if (ids.has(e.id) && e.status === 'dealing') e.status = null;
    }
  }, lastDelay + game.animSettings.dealDuration);
}

function ensureBoardHasSet(cards: Card[], boardSize: number): void {
  const n = Math.min(boardSize, cards.length);
  while (!hasSet(cards.slice(cards.length - n))) {
    shuffle(cards);
  }
}

function endGame(): void {
  game.gameActive = false;

  const elapsedValue = game.elapsed;
  const title = VICTORY_MESSAGES[Math.floor(Math.random() * VICTORY_MESSAGES.length)]!;
  const disqualified = game.hintsUsed;
  const scores = disqualified ? getScores() : persistScore(elapsedValue);
  const currentIdx = disqualified ? -1 : scores.indexOf(elapsedValue);
  game.scores = scores;
  hideCardsThenShowModal(() => {
    game.gameOver = { title, time: elapsedValue, currentIdx, disqualified };
  });
}

function performNewGameSetup(): void {
  game.setsFound = 0;
  selectedIds = [];
  game.board = [];
  game.deck = generateDeck();
  ensureBoardHasSet(game.deck, INITIAL_BOARD);
  game.animating = false;
  game.gameActive = true;
  game.toast = '';
  game.elapsed = 0;
  game.gameOver = null;
  game.menuOpen = false;
  game.paused = false;
  game.hintsUsed = false;
  game.hintIds = [];
  game.hintRevealCount = 0;
  visibilityPaused = false;

  gameStartTime = Date.now();
}

export function runPendingAction(): void {
  const a = game.pendingAction;
  game.pendingAction = null;
  a?.();
}

function dealInExistingBoard(entries: BoardEntry[]): void {
  for (const e of entries) e.status = 'dealing';
  staggerDealDelays(entries);
  scheduleDealClears(entries);
  game.cardsVisible = true;
}

export function newGame(): void {
  hideModalThenRun(() => {
    performNewGameSetup();
    dealCards(INITIAL_BOARD);
    game.cardsVisible = true;
    setTimeout(checkGameState, DEAL_SETTLE_MS);
  });
}

export function openMenu(): void {
  if (game.menuOpen) return;
  if (game.gameActive && !game.paused) {
    pauseStart = Date.now();
    game.paused = true;
  }
  visibilityPaused = false;
  hideCardsThenShowModal(() => { game.menuOpen = true; });
}

export function closeMenu(): void {
  if (!game.menuOpen) return;
  if (!game.gameActive) return;
  hideModalThenRun(() => {
    game.menuOpen = false;
    if (game.paused) {
      gameStartTime += Date.now() - pauseStart;
      game.paused = false;
    }
    dealInExistingBoard(game.board.filter(e => e.card !== null && e.status !== 'placeholder'));
  });
}

export function useHint(): void {
  if (!game.gameActive || game.animating) return;

  game.hintsUsed = true;

  if (game.hintIds.length === 0) {
    const ids = findBoardSet();
    if (!ids) return;
    for (const e of game.board) e.status = e.status === 'hint' || e.status === 'selected' ? null : e.status;
    selectedIds = [];
    game.hintIds = ids;
    game.hintRevealCount = 0;
  }

  if (game.hintRevealCount < game.hintIds.length) {
    setStatusFor([game.hintIds[game.hintRevealCount]!], 'hint');
    game.hintRevealCount += 1;
  }
}

export function handleCardClick(id: number): void {
  if (!game.gameActive) return;

  const entry = game.board.find(e => e.id === id);
  if (!entry) return;

  if (entry.status === 'selected') {
    setStatusFor([id], null);
    selectedIds = selectedIds.filter(x => x !== id);
    return;
  } else if (entry.status !== null && entry.status !== 'hint') return;

  for (const e of game.board) if (e.status === 'hint') e.status = null;
  game.hintIds = [];
  game.hintRevealCount = 0;
  setStatusFor([id], 'selected');
  selectedIds = [...selectedIds, id];

  tryValidateSelection();
}

export function devSkipToEnd(): void {
  if (!game.gameActive) return;
  game.deck = [];
  game.board = [];
  selectedIds = [];
  game.animating = false;
  endGame();
}