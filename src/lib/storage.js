const THEME_KEY = 'set-game-theme';
const SCORES_KEY = 'set-game-scores';

export function initTheme() {
  let theme = 'light';
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') theme = stored;
  } catch (_) {
    // ignore
  }
  document.body.className = theme;
  return theme;
}

export function getTheme() {
  return document.body.className === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_) {
    // ignore
  }
  document.body.className = theme;
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function getScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(x => typeof x === 'number');
  } catch (_) {
    return [];
  }
}

export function saveScore(seconds) {
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
