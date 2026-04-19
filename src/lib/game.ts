export type CardNumber = 1 | 2 | 3;
export type CardShape = 'oval' | 'diamond' | 'squiggle';
export type CardFill = 'solid' | 'striped' | 'open';
export type CardColor = 'red' | 'green' | 'purple';

export type Card = {
  number: CardNumber;
  shape: CardShape;
  fill: CardFill;
  color: CardColor;
};

type Attr = keyof Card;

const NUMBERS: readonly CardNumber[] = [1, 2, 3];
const SHAPES: readonly CardShape[] = ['oval', 'diamond', 'squiggle'];
const FILLS: readonly CardFill[] = ['solid', 'striped', 'open'];
const COLORS: readonly CardColor[] = ['red', 'green', 'purple'];

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function generateDeck(): Card[] {
  const deck: Card[] = [];
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

export function isValidSet(a: Card, b: Card, c: Card): boolean {
  const attrs: Attr[] = ['number', 'shape', 'fill', 'color'];
  for (const attr of attrs) {
    const size = new Set([a[attr], b[attr], c[attr]]).size;
    if (size !== 1 && size !== 3) return false;
  }
  return true;
}

function cardKey(card: Card): string {
  return `${card.number}|${card.shape}|${card.fill}|${card.color}`;
}

function thirdCardKey(a: Card, b: Card): string {
  const attrs: Attr[] = ['number', 'shape', 'fill', 'color'];
  const parts: (string | number)[] = [];
  for (const attr of attrs) {
    if (a[attr] === b[attr]) {
      parts.push(a[attr]);
    } else {
      const options: readonly (string | number)[] =
        attr === 'number' ? NUMBERS
        : attr === 'shape' ? SHAPES
        : attr === 'fill' ? FILLS
        : COLORS;
      const found = options.find((v) => v !== a[attr] && v !== b[attr]);
      parts.push(found!);
    }
  }
  return parts.join('|');
}

export function findSet(cards: Card[]): [number, number, number] | null {
  const n = cards.length;
  if (n < 3) return null;
  const byKey = new Map<string, number>();
  for (let i = 0; i < n; i++) byKey.set(cardKey(cards[i]!), i);
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const k = byKey.get(thirdCardKey(cards[i]!, cards[j]!));
      if (k !== undefined && k !== i && k !== j) return [i, j, k];
    }
  }
  return null;
}

export function hasSet(cards: Card[]): boolean {
  return findSet(cards) !== null;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
