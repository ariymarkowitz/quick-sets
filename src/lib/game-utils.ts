// encode() relies on these being length-3 and in a stable order.
const NUMBERS = [1, 2, 3] as const;
const SHAPES = ['oval', 'diamond', 'squiggle'] as const;
const FILLS = ['solid', 'striped', 'open'] as const;
const COLORS = ['red', 'green', 'purple'] as const;
const attrs = ['number', 'shape', 'fill', 'color'] as const;

export type Card = {
  number: typeof NUMBERS[number];
  shape: typeof SHAPES[number];
  fill: typeof FILLS[number];
  color: typeof COLORS[number];
};

// A card as a tuple of four attributes, each in {0, 1, 2}.
type Code = [number, number, number, number];

function encode(card: Card): Code {
  return [
    NUMBERS.indexOf(card.number),
    SHAPES.indexOf(card.shape),
    FILLS.indexOf(card.fill),
    COLORS.indexOf(card.color),
  ];
}

// The unique card that completes a SET with `a` and `b`.
// Each attribute independently: the third value is (-a - b) mod 3.
const third = (a: Code, b: Code): Code =>
  a.map((v, i) => (6 - v - b[i]!) % 3) as Code;

// Serialize a Code for Map lookup (JS Maps compare arrays by reference).
const keyOf = (c: Code) => c.join(',');

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
  return shuffle(
    NUMBERS.flatMap(number =>
      SHAPES.flatMap(shape =>
        FILLS.flatMap(fill =>
          COLORS.map(color => ({ number, shape, fill, color })))))
  );
}


export function isValidSet(a: Card, b: Card, c: Card): boolean {
  for (const attr of attrs) {
    const size = new Set([a[attr], b[attr], c[attr]]).size;
    if (size !== 1 && size !== 3) return false;
  }
  return true;
}

export function findSet(cards: Card[]): [number, number, number] | null {
  const codes = cards.map(encode);
  const byKey = new Map<string, number>();
  for (let i = 0; i < codes.length; i++) byKey.set(keyOf(codes[i]!), i);
  for (let i = 0; i < codes.length - 1; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const k = byKey.get(keyOf(third(codes[i]!, codes[j]!)));
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
