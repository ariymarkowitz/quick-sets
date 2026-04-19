import { generateDeck, shuffle, isValidSet, hasSet, findSet } from './game.js';
import { saveScore as persistScore, getScores } from './storage.js';
import {
  INITIAL_BOARD, MIN_BOARD, DEAL_SETTLE_MS, DEAL_STAGGER_MS,
  VALID_FLASH_MS, INVALID_FLASH_MS, REMOVE_ANIM_MS, TOAST_MS,
} from './constants.js';

export const game = $state({
  deck: [],
  board: [],
  setsFound: 0,
  elapsed: 0,
  gameActive: false,
  animating: false,
  toast: '',
  scores: [],
  gameOver: null,
});

function ensureBoardHasSet(cards, boardSize) {
  const n = Math.min(boardSize, cards.length);
  while (!hasSet(cards.slice(cards.length - n))) {
    shuffle(cards);
  }
}

let nextId = 0;
const makeId = () => ++nextId;

let timerId = null;
let toastTimeout = null;
let gameStartTime = 0;
let selectedIds = [];

function setEntryStatus(id, newStatus) {
  const entry = game.board.find(e => e.id === id);
  if (entry) entry.status = newStatus;
}

function clearDealingStatus(id) {
  const entry = game.board.find(e => e.id === id);
  if (entry && entry.status === 'dealing') entry.status = null;
}

function dealCards(n) {
  const count = Math.min(n, game.deck.length);
  if (count <= 0) return [];

  const newEntries = [];
  for (let i = 0; i < count; i++) {
    const card = game.deck.pop();
    newEntries.push({ id: makeId(), card, status: 'dealing' });
  }
  game.board.push(...newEntries);

  newEntries.forEach((entry, i) => {
    setTimeout(() => clearDealingStatus(entry.id), i * DEAL_STAGGER_MS + 16);
  });

  return newEntries;
}

function showToast(msg) {
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

function finishAnimating() {
  game.animating = false;
  checkPendingSelection();
}

function checkPendingSelection() {
  const existingIds = new Set(game.board.map(e => e.id));
  selectedIds = selectedIds.filter(id => existingIds.has(id));

  if (selectedIds.length === 3 && !game.animating) {
    game.animating = true;
    validateSelection();
  }
}

function validateSelection() {
  const entries = selectedIds.map(id => game.board.find(e => e.id === id));
  if (entries.some(e => !e)) {
    selectedIds = [];
    game.animating = false;
    return;
  }
  const [a, b, c] = entries;
  const ids = [a.id, b.id, c.id];

  if (isValidSet(a.card, b.card, c.card)) {
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

function removeAndReplenish(idsToRemove) {
  for (const e of game.board) if (idsToRemove.includes(e.id)) e.status = 'removing';

  setTimeout(() => {
    const newEntryIds = [];
    const next = [];
    for (const entry of game.board) {
      if (idsToRemove.includes(entry.id)) {
        if (game.deck.length > 0) {
          const card = game.deck.pop();
          const newEntry = { id: makeId(), card, status: 'dealing' };
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

function reshuffleAndDeal() {
  showToast('No sets here — reshuffling…');
  game.animating = true;

  game.board.forEach((entry, i) => {
    setTimeout(() => setEntryStatus(entry.id, 'removing'), i * DEAL_STAGGER_MS);
  });

  const totalDelay = game.board.length * DEAL_STAGGER_MS + REMOVE_ANIM_MS;

  setTimeout(() => {
    const combined = [...activeEntries().map(e => e.card), ...game.deck];
    ensureBoardHasSet(combined, INITIAL_BOARD);
    game.deck = combined;
    game.board = [];
    selectedIds = [];
    dealCards(Math.min(INITIAL_BOARD, game.deck.length));
    game.animating = false;
    setTimeout(checkGameState, DEAL_SETTLE_MS);
  }, totalDelay);
}

function activeEntries() {
  return game.board.filter(e => e.status !== 'placeholder');
}

function checkGameState() {
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

  const boardCards = active.map(e => e.card);
  if (hasSet(boardCards)) return;

  if (game.deck.length === 0 || !hasSet([...boardCards, ...game.deck])) {
    endGame();
    return;
  }

  reshuffleAndDeal();
}

function endGame() {
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

export function newGame() {
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

  gameStartTime = Date.now();
  timerId = setInterval(() => {
    game.elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  }, 1000);

  dealCards(INITIAL_BOARD);
  setTimeout(() => checkGameState(), DEAL_SETTLE_MS);
}

export function devAutoMatch() {
  if (!game.gameActive || game.animating) return;
  const entries = game.board.filter(e => e.status !== 'removing' && e.status !== 'dealing' && e.status !== 'placeholder');
  const indices = findSet(entries.map(e => e.card));
  if (!indices) return;
  const ids = indices.map(i => entries[i].id);
  for (const e of game.board) {
    if (ids.includes(e.id)) e.status = 'selected';
    else if (e.status === 'selected') e.status = null;
  }
  selectedIds = [...ids];
  game.animating = true;
  validateSelection();
}

export function devSkipToEnd() {
  if (!game.gameActive) return;
  game.deck = [];
  game.board = [];
  selectedIds = [];
  game.animating = false;
  endGame();
}

export function handleCardClick(id) {
  if (!game.gameActive) return;

  const entry = game.board.find(e => e.id === id);
  if (!entry) return;

  if (
    entry.status === 'valid' ||
    entry.status === 'invalid' ||
    entry.status === 'removing' ||
    entry.status === 'dealing'
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
