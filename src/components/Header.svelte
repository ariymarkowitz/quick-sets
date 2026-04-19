<script>
  import { game, newGame } from '../lib/state.svelte.js';
  import { toggleTheme } from '../lib/storage.js';
  import { formatTime } from '../lib/game.js';
  import Toast from './Toast.svelte';
</script>

<header>
  <div class="header-group">
    <span id="timer">{formatTime(game.elapsed)}</span>
    <span id="deck-count">
      <span class="header-icon" aria-hidden="true"></span>
      <span id="deck-count-num">{game.deck.length}</span>
    </span>
  </div>
  <Toast />
  <div class="header-group">
    <button id="theme-toggle" aria-label="Toggle theme" onclick={toggleTheme}></button>
    <button id="new-game-btn" onclick={newGame}>New</button>
  </div>
</header>
