export type Theme = 'light' | 'dark';
export type GameMode = 'chill' | 'speedy';

const THEME_KEY = 'set-game-theme';
const SCORES_KEY = 'set-game-scores';
const MODE_KEY = 'set-game-mode';

export function initTheme(): Theme {
  let theme: Theme = 'light';
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') theme = stored;
  } catch (_) {
    // ignore
  }
  document.body.className = theme;
  return theme;
}

export function getTheme(): Theme {
  return document.body.className === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_) {
    // ignore
  }
  document.body.className = theme;
}

export function toggleTheme(): Theme {
  const current = getTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function getMode(): GameMode {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === 'chill' || stored === 'speedy') return stored;
  } catch (_) {
    // ignore
  }
  return 'chill';
}

export function setMode(mode: GameMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch (_) {
    // ignore
  }
}

export function getScores(): number[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is number => typeof x === 'number');
  } catch (_) {
    return [];
  }
}

export function saveScore(seconds: number): number[] {
  const scores = getScores();
  scores.push(seconds);
  scores.sort((a, b) => a - b);
  const capped = scores.slice(0, 5);
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(capped));
  } catch (_) {
    // ignore
  }
  return capped;
}
