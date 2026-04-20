import { generateDeck, shuffle, isValidSet, hasSet, findSet, type Card } from './game.js';
import { saveScore as persistScore, getScores } from './storage.js';
import {
  INITIAL_BOARD, MIN_BOARD, DEAL_SETTLE_MS, DEAL_STAGGER_MS, DEAL_DURATION_MS,
  VALID_FLASH_MS, INVALID_FLASH_MS, REMOVE_ANIM_MS, TOAST_MS,
} from './constants.js';

export type EntryStatus =
  | null
  | 'dealing'
  | 'selected'
  | 'valid'
  | 'invalid'
  | 'removing'
  | 'placeholder';

export type BoardEntry = {
  id: number;
  card: Card | null;
  status: EntryStatus;
  dealDelay: number;
  removeDelay: number;
};

// Reactive animation settings — change these to scale all transition durations.
export const animSettings = $state({
  dealDuration: DEAL_DURATION_MS,
  removeDuration: REMOVE_ANIM_MS,
  stagger: DEAL_STAGGER_MS,
});

export type GameOverInfo = {
  title: string;
  time: number;
  scores: number[];
  currentIdx: number;
};

export type GameMode = 'casual' | 'hardcore';

export type GameState = {
  deck: Card[];
  board: BoardEntry[];
  setsFound: number;
  elapsed: number;
  gameActive: boolean;
  animating: boolean;
  toast: string;
  scores: number[];
  gameOver: GameOverInfo | null;
  menuOpen: boolean;
  mode: GameMode;
  paused: boolean;
  cardsVisible: boolean;
  modalVisible: boolean;
  pendingAction: (() => void) | null;
};

export const game: GameState = $state({
  deck: [],
  board: [],
  setsFound: 0,
  elapsed: 0,
  gameActive: false,
  animating: false,
  toast: '',
  scores: [],
  gameOver: null,
  menuOpen: true,
  mode: 'casual',
  paused: false,
  cardsVisible: false,
  modalVisible: true,
  pendingAction: null,
});

const activeEntries = $derived(game.board.filter(e => e.status !== 'placeholder'));

function ensureBoardHasSet(cards: Card[], boardSize: number): void {
  const n = Math.min(boardSize, cards.length);
  while (!hasSet(cards.slice(cards.length - n))) {
    shuffle(cards);
  }
}

let nextId = 0;
const makeId = (): number => ++nextId;

let gameStartTime = 0;
let pauseStart = 0;
let selectedIds: number[] = [];

$effect.root(() => {
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
});

function setEntryStatus(id: number, newStatus: EntryStatus): void {
  const entry = game.board.find(e => e.id === id);
  if (entry) entry.status = newStatus;
}

function clearDealingStatus(id: number): void {
  const entry = game.board.find(e => e.id === id);
  if (entry && entry.status === 'dealing') entry.status = null;
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

function showToast(msg: string): void {
  game.toast = msg;
}

function checkPendingSelection(): void {
  const existingIds = new Set(game.board.map(e => e.id));
  selectedIds = selectedIds.filter(id => existingIds.has(id));

  if (selectedIds.length === 3 && !game.animating) {
    game.animating = true;
    validateSelection();
  }
}

function validateSelection(): void {
  const entries = selectedIds.map(id => game.board.find(e => e.id === id));
  if (entries.some(e => !e)) {
    selectedIds = [];
    game.animating = false;
    return;
  }
  const [a, b, c] = entries as [BoardEntry, BoardEntry, BoardEntry];
  const ids = [a.id, b.id, c.id];

  if (a.card && b.card && c.card && isValidSet(a.card, b.card, c.card)) {
    for (const e of game.board) if (ids.includes(e.id)) e.status = 'valid';
    game.setsFound += 1;
    showToast('');
    selectedIds = [];
    setTimeout(() => removeAndReplenish(ids), VALID_FLASH_MS);
  } else {
    for (const e of game.board) if (ids.includes(e.id)) e.status = 'invalid';
    selectedIds = [];
    showToast('Not a set!');
    setTimeout(() => {
      for (const e of game.board) if (ids.includes(e.id) && e.status === 'invalid') e.status = null;
      game.animating = false;
      checkPendingSelection();
    }, INVALID_FLASH_MS);
  }
}

function removeAndReplenish(idsToRemove: number[]): void {
  // Mark cards as removing → the {#if} in CardGrid toggles to false → out: transition fires.
  // The grid slot div persists throughout, so no layout shift occurs.
  for (const e of game.board) {
    if (idsToRemove.includes(e.id)) e.status = 'removing';
  }

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
    checkPendingSelection();
    setTimeout(checkGameState, DEAL_SETTLE_MS);
  }, totalRemoveDuration(idsToRemove.length));
}

function reshuffleAndDeal(): void {
  showToast('No sets here — reshuffling…');
  game.animating = true;

  const combined: Card[] = [
    ...activeEntries.map(e => e.card).filter((c): c is Card => c !== null),
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
    dealCards(Math.min(INITIAL_BOARD, game.deck.length));
    game.animating = false;
    setTimeout(checkGameState, animSettings.dealDuration);
  }, totalRemoveDuration(game.board.length));
}

function checkGameState(): void {
  if (!game.gameActive || game.animating) return;

  if (activeEntries.length === 0 && game.deck.length === 0) {
    endGame();
    return;
  }

  if (activeEntries.length < MIN_BOARD && game.deck.length > 0) {
    dealCards(MIN_BOARD - activeEntries.length);
    setTimeout(checkGameState, DEAL_SETTLE_MS);
    return;
  }

  const boardCards = activeEntries.map(e => e.card).filter((c): c is Card => c !== null);
  if (hasSet(boardCards)) return;

  if (game.deck.length === 0 || !hasSet([...boardCards, ...game.deck])) {
    endGame();
    return;
  }

  reshuffleAndDeal();
}

function hideCardsThenShowModal(prepareModal: () => void): void {
  staggerRemoveDelays(activeEntries);
  for (const entry of activeEntries) entry.status = 'removing';
  selectedIds = [];
  const outroTotal = totalRemoveDuration(activeEntries.length);
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
  entries.forEach((entry, i) => { entry.dealDelay = i * animSettings.stagger; });
}

function staggerRemoveDelays(entries: BoardEntry[]): void {
  entries.forEach((entry, i) => { entry.removeDelay = i * animSettings.stagger; });
}

function totalRemoveDuration(n: number): number {
  return n * animSettings.stagger + animSettings.removeDuration;
}

function scheduleDealClears(entries: BoardEntry[]): void {
  entries.forEach(e => setTimeout(() => clearDealingStatus(e.id), e.dealDelay + animSettings.dealDuration));
}

function endGame(): void {
  game.gameActive = false;

  const elapsedValue = game.elapsed;
  const newScores = persistScore(elapsedValue);
  game.scores = newScores;

  const title = activeEntries.length === 0 && game.deck.length === 0 ? 'You finished!' : 'No more sets!';
  const currentIdx = newScores.indexOf(elapsedValue);

  hideCardsThenShowModal(() => {
    game.gameOver = { title, time: elapsedValue, scores: newScores, currentIdx };
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

  gameStartTime = Date.now();

  dealCards(INITIAL_BOARD);
  setTimeout(() => checkGameState(), DEAL_SETTLE_MS);
}

export function newGame(): void {
  hideModalThenRun(() => {
    performNewGameSetup();
    staggerDealDelays(game.board);
    game.cardsVisible = true;
  });
}

export function openMenu(): void {
  if (game.menuOpen) return;
  if (game.gameActive && !game.paused) {
    pauseStart = Date.now();
    game.paused = true;
  }
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
    const dealable = game.board.filter(e => e.card !== null && e.status !== 'placeholder');
    for (const e of dealable) e.status = 'dealing';
    staggerDealDelays(dealable);
    scheduleDealClears(dealable);
    game.cardsVisible = true;
  });
}

export function devAutoMatch(): void {
  if (!game.gameActive || game.animating) return;
  const entries = game.board.filter(
    e => e.status !== 'removing' && e.status !== 'dealing' && e.status !== 'placeholder' && e.card !== null,
  );
  const indices = findSet(entries.map(e => e.card as Card));
  if (!indices) return;
  const ids = indices.map(i => entries[i]!.id);
  for (const e of game.board) {
    if (ids.includes(e.id)) e.status = 'selected';
    else if (e.status === 'selected') e.status = null;
  }
  selectedIds = [...ids];
  game.animating = true;
  validateSelection();
}

export function devSkipToEnd(): void {
  if (!game.gameActive) return;
  game.deck = [];
  game.board = [];
  selectedIds = [];
  game.animating = false;
  endGame();
}

export function handleCardClick(id: number): void {
  if (!game.gameActive) return;

  const entry = game.board.find(e => e.id === id);
  if (!entry) return;

  if (entry.status === 'selected') {
    setEntryStatus(id, null);
    selectedIds = selectedIds.filter(x => x !== id);
    return;
  } else if (entry.status !== null) return;

  setEntryStatus(id, 'selected');
  selectedIds = [...selectedIds, id];

  if (selectedIds.length === 3 && !game.animating) {
    game.animating = true;
    validateSelection();
  }
}

try {
  game.scores = getScores();
} catch (_) {
  // ignore (e.g. SSR)
}
