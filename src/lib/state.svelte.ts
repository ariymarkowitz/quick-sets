import { generateDeck, shuffle, isValidSet, hasSet, findSet, type Card } from './game.js';
import { saveScore as persistScore, getScores } from './storage.js';
import {
  INITIAL_BOARD, MIN_BOARD, DEAL_SETTLE_MS, DEAL_STAGGER_MS,
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
};

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
});

function ensureBoardHasSet(cards: Card[], boardSize: number): void {
  const n = Math.min(boardSize, cards.length);
  while (!hasSet(cards.slice(cards.length - n))) {
    shuffle(cards);
  }
}

let nextId = 0;
const makeId = (): number => ++nextId;

let timerId: ReturnType<typeof setInterval> | null = null;
let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let gameStartTime = 0;
let pausedAt: number | null = null;
let selectedIds: number[] = [];

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
    newEntries.push({ id: makeId(), card, status: 'dealing' });
  }
  game.board.push(...newEntries);

  newEntries.forEach((entry, i) => {
    setTimeout(() => clearDealingStatus(entry.id), i * DEAL_STAGGER_MS + 16);
  });

  return newEntries;
}

function showToast(msg: string): void {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
  if (!msg) {
    game.toast = '';
    return;
  }
  game.toast = msg;
  toastTimeout = setTimeout(() => {
    game.toast = '';
    toastTimeout = null;
  }, TOAST_MS);
}

function finishAnimating(): void {
  game.animating = false;
  checkPendingSelection();
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
      finishAnimating();
    }, INVALID_FLASH_MS);
  }
}

function removeAndReplenish(idsToRemove: number[]): void {
  for (const e of game.board) if (idsToRemove.includes(e.id)) e.status = 'removing';

  setTimeout(() => {
    const newEntryIds: number[] = [];
    const next: BoardEntry[] = [];
    for (const entry of game.board) {
      if (idsToRemove.includes(entry.id)) {
        if (game.deck.length > 0) {
          const card = game.deck.pop()!;
          const newEntry: BoardEntry = { id: makeId(), card, status: 'dealing' };
          newEntryIds.push(newEntry.id);
          next.push(newEntry);
        } else {
          next.push({ id: makeId(), card: null, status: 'placeholder' });
        }
      } else {
        next.push(entry);
      }
    }
    game.board = next;

    newEntryIds.forEach((id, i) => {
      setTimeout(() => clearDealingStatus(id), i * DEAL_STAGGER_MS + 16);
    });

    finishAnimating();
    setTimeout(checkGameState, DEAL_SETTLE_MS);
  }, REMOVE_ANIM_MS);
}

function reshuffleAndDeal(): void {
  showToast('No sets here — reshuffling…');
  game.animating = true;

  game.board.forEach((entry, i) => {
    setTimeout(() => setEntryStatus(entry.id, 'removing'), i * DEAL_STAGGER_MS);
  });

  const totalDelay = game.board.length * DEAL_STAGGER_MS + REMOVE_ANIM_MS;

  setTimeout(() => {
    const combined: Card[] = [
      ...activeEntries().map(e => e.card).filter((c): c is Card => c !== null),
      ...game.deck,
    ];
    ensureBoardHasSet(combined, INITIAL_BOARD);
    game.deck = combined;
    game.board = [];
    selectedIds = [];
    dealCards(Math.min(INITIAL_BOARD, game.deck.length));
    game.animating = false;
    setTimeout(checkGameState, DEAL_SETTLE_MS);
  }, totalDelay);
}

function activeEntries(): BoardEntry[] {
  return game.board.filter(e => e.status !== 'placeholder');
}

function checkGameState(): void {
  if (!game.gameActive || game.animating) return;

  const active = activeEntries();

  if (active.length === 0 && game.deck.length === 0) {
    endGame();
    return;
  }

  if (active.length < MIN_BOARD && game.deck.length > 0) {
    dealCards(MIN_BOARD - active.length);
    setTimeout(checkGameState, DEAL_SETTLE_MS);
    return;
  }

  const boardCards = active.map(e => e.card).filter((c): c is Card => c !== null);
  if (hasSet(boardCards)) return;

  if (game.deck.length === 0 || !hasSet([...boardCards, ...game.deck])) {
    endGame();
    return;
  }

  reshuffleAndDeal();
}

function endGame(): void {
  game.gameActive = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  const elapsedValue = game.elapsed;
  const newScores = persistScore(elapsedValue);
  game.scores = newScores;

  const title = activeEntries().length === 0 && game.deck.length === 0 ? 'You finished!' : 'No more sets!';
  const currentIdx = newScores.indexOf(elapsedValue);

  game.gameOver = { title, time: elapsedValue, scores: newScores, currentIdx };
}

export function newGame(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

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

  pausedAt = null;
  gameStartTime = Date.now();
  timerId = setInterval(() => {
    game.elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  }, 1000);

  dealCards(INITIAL_BOARD);
  setTimeout(() => checkGameState(), DEAL_SETTLE_MS);
}

export function openMenu(): void {
  if (game.menuOpen) return;
  game.menuOpen = true;
  if (game.gameActive && pausedAt === null) {
    pausedAt = Date.now();
  }
}

export function closeMenu(): void {
  if (!game.menuOpen) return;
  if (!game.gameActive) return;
  game.menuOpen = false;
  if (pausedAt !== null) {
    gameStartTime += Date.now() - pausedAt;
    pausedAt = null;
  }
}

export function setMode(mode: GameMode): void {
  game.mode = mode;
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

  if (
    entry.status === 'valid' ||
    entry.status === 'invalid' ||
    entry.status === 'removing' ||
    entry.status === 'dealing' ||
    entry.status === 'placeholder'
  ) {
    return;
  }

  if (entry.status === 'selected') {
    setEntryStatus(id, null);
    selectedIds = selectedIds.filter(x => x !== id);
    return;
  }

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
