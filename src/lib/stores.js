import { writable, derived, get } from 'svelte/store';
import { generateDeck, shuffle, isValidSet, hasSet } from './game.js';
import { saveScore as persistScore, toggleTheme, getScores } from './storage.js';
import {
  INITIAL_BOARD, MIN_BOARD, DEAL_SETTLE_MS, DEAL_STAGGER_MS,
  VALID_FLASH_MS, INVALID_FLASH_MS, REMOVE_ANIM_MS, TOAST_MS,
} from './constants.js';

// --- Stores ---
export const deck = writable([]);
export const board = writable([]);
export const setsFound = writable(0);
export const elapsed = writable(0);
export const gameActive = writable(false);
export const animating = writable(false);
export const toast = writable('');
export const scores = writable([]);
export const gameOver = writable(null);

export const deckCount = derived(deck, $d => $d.length);

// --- Internal state ---
let nextId = 0;
const makeId = () => ++nextId;

let timerId = null;
let toastTimeout = null;
let gameStartTime = 0;
let selectedIds = [];

// --- Helpers ---
function setEntryStatus(id, newStatus) {
  board.update(b => b.map(e => (e.id === id ? { ...e, status: newStatus } : e)));
}

function clearDealingStatus(id) {
  board.update(b => b.map(e => (e.id === id && e.status === 'dealing' ? { ...e, status: null } : e)));
}

function dealCards(n) {
  const currentDeck = get(deck);
  const count = Math.min(n, currentDeck.length);
  if (count <= 0) return [];

  const remainingDeck = currentDeck.slice();
  const newEntries = [];
  for (let i = 0; i < count; i++) {
    const card = remainingDeck.pop();
    newEntries.push({ id: makeId(), card, status: 'dealing' });
  }
  deck.set(remainingDeck);
  board.update(b => [...b, ...newEntries]);

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
    toast.set('');
    return;
  }
  toast.set(msg);
  toastTimeout = setTimeout(() => {
    toast.set('');
    toastTimeout = null;
  }, TOAST_MS);
}

function finishAnimating() {
  animating.set(false);
  checkPendingSelection();
}

function checkPendingSelection() {
  const b = get(board);
  const existingIds = new Set(b.map(e => e.id));
  selectedIds = selectedIds.filter(id => existingIds.has(id));

  if (selectedIds.length === 3 && !get(animating)) {
    animating.set(true);
    validateSelection();
  }
}

function validateSelection() {
  const b = get(board);
  const entries = selectedIds.map(id => b.find(e => e.id === id));
  if (entries.some(e => !e)) {
    // Shouldn't happen but guard anyway.
    selectedIds = [];
    animating.set(false);
    return;
  }
  const [a, b2, c] = entries;

  if (isValidSet(a.card, b2.card, c.card)) {
    const ids = [a.id, b2.id, c.id];
    board.update(list => list.map(e => (ids.includes(e.id) ? { ...e, status: 'valid' } : e)));
    setsFound.update(n => n + 1);
    showToast('');
    selectedIds = [];
    setTimeout(() => removeAndReplenish(ids), VALID_FLASH_MS);
  } else {
    const ids = [a.id, b2.id, c.id];
    board.update(list => list.map(e => (ids.includes(e.id) ? { ...e, status: 'invalid' } : e)));
    selectedIds = [];
    showToast('Not a set!');
    setTimeout(() => {
      board.update(list => list.map(e => (ids.includes(e.id) && e.status === 'invalid' ? { ...e, status: null } : e)));
      finishAnimating();
    }, INVALID_FLASH_MS);
  }
}

function removeAndReplenish(idsToRemove) {
  board.update(list => list.map(e => (idsToRemove.includes(e.id) ? { ...e, status: 'removing' } : e)));

  setTimeout(() => {
    const newEntryIds = [];
    board.update(list => {
      const currentDeck = get(deck).slice();
      const next = [];
      for (const entry of list) {
        if (idsToRemove.includes(entry.id)) {
          if (currentDeck.length > 0) {
            const card = currentDeck.pop();
            const newEntry = { id: makeId(), card, status: 'dealing' };
            newEntryIds.push(newEntry.id);
            next.push(newEntry);
          }
          // else: drop the slot entirely
        } else {
          next.push(entry);
        }
      }
      deck.set(currentDeck);
      return next;
    });

    newEntryIds.forEach((id, i) => {
      setTimeout(() => clearDealingStatus(id), i * DEAL_STAGGER_MS + 16);
    });

    finishAnimating();
    setTimeout(checkGameState, DEAL_SETTLE_MS);
  }, REMOVE_ANIM_MS);
}

function reshuffleAndDeal() {
  showToast('No sets here — reshuffling…');
  animating.set(true);

  const b = get(board);
  b.forEach((entry, i) => {
    setTimeout(() => setEntryStatus(entry.id, 'removing'), i * DEAL_STAGGER_MS);
  });

  const totalDelay = b.length * DEAL_STAGGER_MS + REMOVE_ANIM_MS;

  setTimeout(() => {
    const combined = [...get(board).map(e => e.card), ...get(deck)];
    shuffle(combined);
    deck.set(combined);
    board.set([]);
    selectedIds = [];
    dealCards(Math.min(INITIAL_BOARD, get(deck).length));
    animating.set(false);
    setTimeout(checkGameState, DEAL_SETTLE_MS);
  }, totalDelay);
}

function checkGameState() {
  if (!get(gameActive) || get(animating)) return;

  const b = get(board);
  const d = get(deck);

  if (b.length === 0 && d.length === 0) {
    endGame();
    return;
  }

  if (b.length < MIN_BOARD && d.length > 0) {
    dealCards(MIN_BOARD - b.length);
    setTimeout(checkGameState, DEAL_SETTLE_MS);
    return;
  }

  const boardCards = b.map(e => e.card);
  if (hasSet(boardCards)) return;

  if (d.length === 0 || !hasSet([...boardCards, ...d])) {
    endGame();
    return;
  }

  reshuffleAndDeal();
}

function endGame() {
  gameActive.set(false);
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  const elapsedValue = get(elapsed);
  const newScores = persistScore(elapsedValue);
  scores.set(newScores);

  const b = get(board);
  const d = get(deck);
  const title = b.length === 0 && d.length === 0 ? 'You finished!' : 'No more sets!';
  const currentIdx = newScores.indexOf(elapsedValue);

  gameOver.set({ title, time: elapsedValue, scores: newScores, currentIdx });
}

// --- Exported actions ---

export function newGame() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  setsFound.set(0);
  selectedIds = [];
  board.set([]);
  deck.set(generateDeck());
  animating.set(false);
  gameActive.set(true);
  toast.set('');
  elapsed.set(0);
  gameOver.set(null);

  gameStartTime = Date.now();
  timerId = setInterval(() => {
    elapsed.set(Math.floor((Date.now() - gameStartTime) / 1000));
  }, 1000);

  dealCards(INITIAL_BOARD);
  setTimeout(() => checkGameState(), DEAL_SETTLE_MS);
}

export function handleCardClick(id) {
  if (!get(gameActive)) return;

  const b = get(board);
  const entry = b.find(e => e.id === id);
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

  if (selectedIds.length === 3 && !get(animating)) {
    animating.set(true);
    validateSelection();
  }
}

export function toggleThemeAction() {
  return toggleTheme();
}

// Load any previously-saved scores into the store at module init so UI can show
// them before the first game ends.
try {
  scores.set(getScores());
} catch (_) {
  // ignore (e.g. SSR)
}
