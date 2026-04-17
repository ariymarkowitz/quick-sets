// ─── Constants ───────────────────────────────────────────────────────────────

const COLOR_MAP = { red: '#e63946', green: '#2d9a4e', purple: '#7b5ea7' };

const CARD_W         = 100;                        // SVG viewBox width
const CARD_H         = 160;                        // SVG viewBox height
const SHAPE_NATIVE_W = 120;                        // native width of all shape paths
const SHAPE_W        = 84;                         // rendered shape width (viewBox units)
const SHAPE_PAD_X    = (CARD_W - SHAPE_W) / 2;    // horizontal offset to center shape
const SHAPE_SCALE    = SHAPE_W / SHAPE_NATIVE_W;
const STROKE_THIN    = 1.5;                        // stroke width for solid fill (SVG units)
const STROKE_THICK   = 3;                          // stroke width for open/striped (SVG units)
const GAP_SCALE      = 0.2;                       // additional gap between shapes as a fraction of shape height

// Path data extracted from shapes/*.svg files (all have native width=SHAPE_NATIVE_W)
const SHAPE_DATA = {
  oval:     { d: 'M27.5 0A27.5 27.5 0 0 0 0 27.5 27.5 27.5 0 0 0 27.5 55h65A27.5 27.5 0 0 0 120 27.5 27.5 27.5 0 0 0 92.5 0Z', h: 55 },
  diamond:  { d: 'M0 30 60 0l60 30-60 30Z', h: 60 },
  squiggle: { d: 'M87.15 57.29c9.59-1.68 18.96-6.83 24.85-15.82 5.66-7.6 8.1-17.6 7.9-27.45.89-7.09-4.3-14.95-10.94-13.93-5.57 1.03-9.16 6.7-14.12 9.32-6.33 4.72-14.45 6.24-21.61 3.15-3.2-1.18-6.33-2.5-9.42-3.82C54 4.6 43.5.64 32.85 2.7 23.26 4.37 13.89 9.52 8 18.5 2.34 26.11-.1 36.12.1 45.96c-.9 7.09 4.32 15.05 10.94 13.94 5.59-.94 9.42-6.27 14.12-9.33 6.62-4.3 14.4-6.12 21.61-3.15 3.15 1.3 6.33 2.51 9.42 3.82 9.8 4.15 20.31 8.1 30.96 6.05', h: 60 },
};
// Slot height uses the tallest shape so all shapes share the same center-point positions
const SHAPE_SLOT_H = Math.max(...Object.values(SHAPE_DATA).map(s => s.h)) * SHAPE_SCALE * (1 + GAP_SCALE);

// ─── State ───────────────────────────────────────────────────────────────────

let deck = [];
let board = [];
let selected = [];
let setsFound = 0;
let gameStartTime = null;
let timerInterval = null;
let gameActive = false;
let animating = false;
let toastTimeout = null;

// ─── Deck Generation ─────────────────────────────────────────────────────────

function generateDeck() {
  const cards = [];
  for (const number of [1, 2, 3])
    for (const shape of ['oval', 'diamond', 'squiggle'])
      for (const fill of ['solid', 'striped', 'open'])
        for (const color of ['red', 'green', 'purple'])
          cards.push({ number, shape, fill, color });
  return fisherYatesShuffle(cards);
}

function fisherYatesShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Set Validation ───────────────────────────────────────────────────────────

function isValidSet(a, b, c) {
  return ['number', 'shape', 'fill', 'color'].every(attr => {
    const s = new Set([a[attr], b[attr], c[attr]]);
    return s.size === 1 || s.size === 3;
  });
}

function hasSet(cards) {
  for (let i = 0; i < cards.length - 2; i++)
    for (let j = i + 1; j < cards.length - 1; j++)
      for (let k = j + 1; k < cards.length; k++)
        if (isValidSet(cards[i], cards[j], cards[k])) return true;
  return false;
}

// ─── SVG Card Rendering ──────────────────────────────────────────────────────

function createCardElement(card) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const div = document.createElement('div');
  div.className = 'card';

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${CARD_W} ${CARD_H}`);
  svg.setAttribute('class', 'card-svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const uid = Math.random().toString(36).slice(2, 9);
  const color = COLOR_MAP[card.color];

  // Add stripe pattern defs if needed
  if (card.fill === 'striped') {
    const defs = document.createElementNS(svgNS, 'defs');
    defs.innerHTML = `<pattern id="stripe-${uid}" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="4" stroke="${color}" stroke-width="1.5"/>
    </pattern>`;
    svg.appendChild(defs);
  }

  const shapeH = SHAPE_DATA[card.shape].h * SHAPE_SCALE;
  const startY = (CARD_H - (card.number - 1) * SHAPE_SLOT_H) / 2;
  const yPositions = Array.from({ length: card.number }, (_, i) => startY + i * SHAPE_SLOT_H);

  for (const y of yPositions) {
    const { d } = SHAPE_DATA[card.shape];
    const ty = y - shapeH / 2;

    const pathEl = document.createElementNS(svgNS, 'path');
    pathEl.setAttribute('d', d);
    pathEl.setAttribute('transform', `translate(${SHAPE_PAD_X}, ${ty.toFixed(2)}) scale(${SHAPE_SCALE})`);

    if (card.fill === 'solid') {
      pathEl.setAttribute('fill', color);
      pathEl.setAttribute('stroke', color);
      pathEl.setAttribute('stroke-width', `${(STROKE_THIN / SHAPE_SCALE).toFixed(2)}`);
    } else if (card.fill === 'open') {
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('stroke', color);
      pathEl.setAttribute('stroke-width', `${(STROKE_THICK / SHAPE_SCALE).toFixed(2)}`);
    } else {
      // striped
      pathEl.setAttribute('fill', `url(#stripe-${uid})`);
      pathEl.setAttribute('stroke', color);
      pathEl.setAttribute('stroke-width', `${(STROKE_THICK / SHAPE_SCALE).toFixed(2)}`);
    }

    svg.appendChild(pathEl);
  }

  div.appendChild(svg);
  return div;
}

// ─── Display Helpers ─────────────────────────────────────────────────────────

function updateDisplay() {
  document.getElementById('deck-count').textContent = `Deck: ${deck.length}`;
  document.getElementById('sets-found').textContent = `Sets: ${setsFound}`;
}

function updateTimer() {
  if (!gameStartTime) return;
  const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  document.getElementById('timer').textContent = formatTime(elapsed);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function showToast(msg) {
  const el = document.getElementById('message-toast');
  if (toastTimeout) clearTimeout(toastTimeout);
  if (!msg) {
    el.classList.add('hidden');
    return;
  }
  el.textContent = msg;
  el.classList.remove('hidden');
  toastTimeout = setTimeout(() => el.classList.add('hidden'), 2500);
}

// ─── Theme ───────────────────────────────────────────────────────────────────

function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.contains('dark');
  body.classList.toggle('dark', !isDark);
  body.classList.toggle('light', isDark);
  document.getElementById('theme-toggle').textContent = isDark ? '🌙' : '☀️';
  localStorage.setItem('set-game-theme', isDark ? 'light' : 'dark');
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function saveScore(seconds) {
  let scores = [];
  try {
    scores = JSON.parse(localStorage.getItem('set-game-scores') || '[]');
  } catch (e) {
    scores = [];
  }
  scores.push(seconds);
  scores.sort((a, b) => a - b);
  if (scores.length > 5) scores.length = 5;
  localStorage.setItem('set-game-scores', JSON.stringify(scores));
  return scores;
}

// ─── Game Flow ────────────────────────────────────────────────────────────────

function initGame() {
  // Stop any existing timer
  clearInterval(timerInterval);
  timerInterval = null;

  // Clear the board DOM
  document.getElementById('card-grid').innerHTML = '';

  // Reset state
  gameActive = true;
  animating = false;
  setsFound = 0;
  selected = [];
  board = [];
  deck = [];

  // Fresh deck
  deck = generateDeck();

  // Start timer
  gameStartTime = Date.now();
  document.getElementById('timer').textContent = '0:00';
  timerInterval = setInterval(updateTimer, 1000);

  // Deal initial 12 cards
  dealCards(12);

  // Wait for deal animations before checking for sets
  setTimeout(() => checkGameState(), 150);
}

function dealCards(n) {
  const count = Math.min(n, deck.length);
  for (let i = 0; i < count; i++) {
    const card = deck.pop();
    const el = createCardElement(card);
    const entry = { card, el };
    board.push(entry);
    el.addEventListener('click', () => handleCardClick(entry));
    el.classList.add('dealing'); // start invisible before paint
    document.getElementById('card-grid').appendChild(el);

    // Stagger deal-in transition (remove class after one frame + stagger)
    const delay = i * 10;
    setTimeout(() => el.classList.remove('dealing'), delay + 16);
  }
  updateDisplay();
}

function handleCardClick(entry) {
  if (!gameActive || animating) return;
  const { el } = entry;

  // Deselect if already selected
  const idx = selected.indexOf(entry);
  if (idx !== -1) {
    selected.splice(idx, 1);
    el.classList.remove('selected');
    return;
  }

  // Select
  el.classList.add('selected');
  selected.push(entry);

  if (selected.length === 3) {
    animating = true;
    validateSelection();
  }
}

function validateSelection() {
  const [a, b, c] = selected;

  if (isValidSet(a.card, b.card, c.card)) {
    // Valid set
    selected.forEach(e => {
      e.el.classList.remove('selected');
      e.el.classList.add('valid');
    });
    setsFound++;
    updateDisplay();
    showToast('');

    const toRemove = selected.slice();
    selected = [];

    setTimeout(() => {
      toRemove.forEach(e => e.el.classList.remove('valid'));
      removeAndReplenish(toRemove);
    }, 180);
  } else {
    // Invalid set
    selected.forEach(e => {
      e.el.classList.remove('selected');
      e.el.classList.add('invalid');
    });
    showToast('Not a set!');

    setTimeout(() => {
      selected.forEach(e => e.el.classList.remove('invalid'));
      selected = [];
      animating = false;
    }, 180);
  }
}

function removeAndReplenish(entries) {
  // Animate out
  entries.forEach(e => e.el.classList.add('removing'));

  setTimeout(() => {
    const grid = document.getElementById('card-grid');
    let dealtCount = 0;

    entries.forEach((e, i) => {
      const boardIdx = board.indexOf(e);

      if (deck.length > 0) {
        // Replace card in-place (same DOM position, same board index)
        const card = deck.pop();
        const el = createCardElement(card);
        const entry = { card, el };
        el.addEventListener('click', () => handleCardClick(entry));
        el.classList.add('dealing'); // start invisible before paint
        grid.replaceChild(el, e.el);
        if (boardIdx !== -1) board[boardIdx] = entry;
        else board.push(entry);

        const delay = dealtCount * 10;
        setTimeout(() => el.classList.remove('dealing'), delay + 16);
        dealtCount++;
      } else {
        // Deck exhausted — just remove
        e.el.remove();
        if (boardIdx !== -1) board.splice(boardIdx, 1);
      }
    });

    updateDisplay();
    animating = false;

    // Wait for deal animation, then check state
    setTimeout(() => checkGameState(), 150);
  }, 130);
}

function checkGameState() {
  if (!gameActive) return;

  // Board empty and deck empty → game over
  if (board.length === 0 && deck.length === 0) {
    endGame();
    return;
  }

  // Deal cards if board is very short but deck has more
  if (board.length < 3 && deck.length > 0) {
    dealCards(3 - board.length);
    setTimeout(() => checkGameState(), 150);
    return;
  }

  const boardCards = board.map(e => e.card);

  if (!hasSet(boardCards)) {
    if (deck.length === 0) {
      endGame();
    } else {
      reshuffleAndDeal();
    }
  }
}

function reshuffleAndDeal() {
  showToast('No sets here — reshuffling…');
  animating = true;

  // Animate all cards out with a slight stagger
  board.forEach((e, i) => {
    setTimeout(() => e.el.classList.add('removing'), i * 10);
  });

  const totalDelay = board.length * 10 + 130;

  setTimeout(() => {
    // Collect all cards back
    const allCards = [...board.map(e => e.card), ...deck];
    fisherYatesShuffle(allCards);

    board.forEach(e => e.el.remove());
    board = [];
    deck = allCards;
    selected = [];

    updateDisplay();
    dealCards(Math.min(12, deck.length));
    animating = false;

    setTimeout(() => {
      checkGameState();
    }, 150);
  }, totalDelay);
}

function endGame() {
  gameActive = false;
  clearInterval(timerInterval);
  timerInterval = null;

  const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  const scores = saveScore(elapsed);

  const title =
    board.length === 0 && deck.length === 0 ? 'You finished!' : 'No more sets!';
  document.getElementById('modal-title').textContent = title;
  document.getElementById('final-time-display').textContent = formatTime(elapsed);

  // Populate leaderboard, highlighting only the first occurrence of the current score
  let highlightedCurrent = false;
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = scores
    .map((s, i) => {
      const isCurrent = !highlightedCurrent && s === elapsed;
      if (isCurrent) highlightedCurrent = true;
      return `<li${isCurrent ? ' class="current-score"' : ''}>${i + 1}. ${formatTime(s)}</li>`;
    })
    .join('');

  document.getElementById('overlay').classList.remove('hidden');
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Restore theme
  const savedTheme = localStorage.getItem('set-game-theme') || 'light';
  document.body.className = savedTheme;
  document.getElementById('theme-toggle').textContent =
    savedTheme === 'dark' ? '☀️' : '🌙';

  // Button listeners
  document.getElementById('new-game-btn').addEventListener('click', initGame);
  document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('overlay').classList.add('hidden');
    initGame();
  });
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  initGame();
});
