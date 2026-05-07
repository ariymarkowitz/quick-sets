export type Theme = 'light' | 'dark';
import type { GameMode } from './Game.svelte.js';

const THEME_KEY = 'set-game-theme';
const SCORES_KEY = 'set-game-scores';
const MODE_KEY = 'set-game-mode';

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'light';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  document.body.className = theme;
}

export function getMode(): GameMode {
  const stored = localStorage.getItem(MODE_KEY);
  if (stored === 'chill' || stored === 'speedy') return stored;
  return 'chill';
}

export function setMode(mode: GameMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

export function getScores(): number[] {
  const raw = localStorage.getItem(SCORES_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x): x is number => typeof x === 'number');
}

export function saveScore(seconds: number): number[] {
  const scores = getScores();
  scores.push(seconds);
  scores.sort((a, b) => a - b);
  const capped = scores.slice(0, 5);
  localStorage.setItem(SCORES_KEY, JSON.stringify(capped));
  return capped;
}
