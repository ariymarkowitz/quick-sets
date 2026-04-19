// TODO [Claude]: Implement the game as a Progressive Web App

const NUMBERS = [1, 2, 3];
const SHAPES = ['oval', 'diamond', 'squiggle'];
const FILLS = ['solid', 'striped', 'open'];
const COLORS = ['red', 'green', 'purple'];

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function generateDeck() {
  const deck = [];
  for (const number of NUMBERS) {
    for (const shape of SHAPES) {
      for (const fill of FILLS) {
        for (const color of COLORS) {
          deck.push({ number, shape, fill, color });
        }
      }
    }
  }
  return shuffle(deck);
}

export function isValidSet(a, b, c) {
  const attrs = ['number', 'shape', 'fill', 'color'];
  for (const attr of attrs) {
    const size = new Set([a[attr], b[attr], c[attr]]).size;
    if (size !== 1 && size !== 3) return false;
  }
  return true;
}

function cardKey(card) {
  return `${card.number}|${card.shape}|${card.fill}|${card.color}`;
}

function thirdCardKey(a, b) {
  const attrs = ['number', 'shape', 'fill', 'color'];
  const parts = [];
  for (const attr of attrs) {
    if (a[attr] === b[attr]) {
      parts.push(a[attr]);
    } else {
      const options = attr === 'number' ? NUMBERS
        : attr === 'shape' ? SHAPES
        : attr === 'fill' ? FILLS
        : COLORS;
      parts.push(options.find((v) => v !== a[attr] && v !== b[attr]));
    }
  }
  return parts.join('|');
}

export function findSet(cards) {
  const n = cards.length;
  if (n < 3) return null;
  const byKey = new Map();
  for (let i = 0; i < n; i++) byKey.set(cardKey(cards[i]), i);
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const k = byKey.get(thirdCardKey(cards[i], cards[j]));
      if (k !== undefined && k !== i && k !== j) return [i, j, k];
    }
  }
  return null;
}

export function hasSet(cards) {
  return findSet(cards) !== null;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
