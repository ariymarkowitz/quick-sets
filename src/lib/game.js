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

export function hasSet(cards) {
  const n = cards.length;
  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      for (let k = j + 1; k < n; k++) {
        if (isValidSet(cards[i], cards[j], cards[k])) return true;
      }
    }
  }
  return false;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
