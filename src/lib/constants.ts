export const COLOR_MAP: Record<'red' | 'green' | 'purple', string> = {
  red: '#e63946',
  green: '#2d9a4e',
  purple: '#7b5ea7',
};

export const CARD_W = 100;
export const CARD_H = 160;
export const SHAPE_NATIVE_W = 120;
export const SHAPE_W = 84;
export const SHAPE_PAD_X = (CARD_W - SHAPE_W) / 2;
export const SHAPE_SCALE = SHAPE_W / SHAPE_NATIVE_W;
export const STROKE_THIN = 1.5;
export const STROKE_THICK = 3;
export const GAP_SCALE = 0.2;
export const DEAL_SETTLE_MS = 150;

export type ShapeName = 'oval' | 'diamond' | 'squiggle';

export const SHAPE_DATA: Record<ShapeName, { d: string; h: number }> = {
  oval:     { d: 'M27.5 0A27.5 27.5 0 0 0 0 27.5 27.5 27.5 0 0 0 27.5 55h65A27.5 27.5 0 0 0 120 27.5 27.5 27.5 0 0 0 92.5 0Z', h: 55 },
  diamond:  { d: 'M0 30 60 0l60 30-60 30Z', h: 60 },
  squiggle: { d: 'M87.15 57.29c9.59-1.68 18.96-6.83 24.85-15.82 5.66-7.6 8.1-17.6 7.9-27.45.89-7.09-4.3-14.95-10.94-13.93-5.57 1.03-9.16 6.7-14.12 9.32-6.33 4.72-14.45 6.24-21.61 3.15-3.2-1.18-6.33-2.5-9.42-3.82C54 4.6 43.5.64 32.85 2.7 23.26 4.37 13.89 9.52 8 18.5 2.34 26.11-.1 36.12.1 45.96c-.9 7.09 4.32 15.05 10.94 13.94 5.59-.94 9.42-6.27 14.12-9.33 6.62-4.3 14.4-6.12 21.61-3.15 3.15 1.3 6.33 2.51 9.42 3.82 9.8 4.15 20.31 8.1 30.96 6.05', h: 60 },
};

export const SHAPE_SLOT_H = Math.max(...Object.values(SHAPE_DATA).map(s => s.h)) * SHAPE_SCALE * (1 + GAP_SCALE);

export const TOAST_MS = 2500;

export const MODE_TIMINGS = {
  speedy: {
    dealDuration: 150, removeDuration: 130, stagger: 20, fastStagger: 20,
    validFlash: 120, invalidFlash: 180, shakeDuration: 150,
  },
  chill: {
    dealDuration: 280, removeDuration: 240, stagger: 100, fastStagger: 20,
    validFlash: 360, invalidFlash: 340, shakeDuration: 260,
  },
} as const;
export const INITIAL_BOARD = 12;
export const MIN_BOARD = 3;

export const VICTORY_MESSAGES = [
  "All sets found!",
  "Mission accomplished!",
  "Victory!",
  "You did it!",
  "No more sets!",
  "Deck complete!",
  "Congratulations!"
]
