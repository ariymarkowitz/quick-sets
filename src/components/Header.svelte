<script lang="ts">
  import { game, newGame, devAutoMatch, devSkipToEnd } from '../lib/state.svelte';
  import { toggleTheme } from '../lib/storage';
  import { formatTime } from '../lib/game';
  import Toast from './Toast.svelte';

  const isDev = import.meta.env.DEV;
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
    {#if isDev}
      <button class="dev-btn" title="Auto-match a set" onclick={devAutoMatch}>▶</button>
      <button class="dev-btn" title="Skip to end" onclick={devSkipToEnd}>⏭</button>
    {/if}
    <button id="theme-toggle" aria-label="Toggle theme" onclick={toggleTheme}></button>
    <button id="new-game-btn" onclick={newGame}>New</button>
  </div>
</header>

<style>
  .dev-btn {
    background: transparent;
    border: 1px dashed var(--border, #888);
    color: inherit;
    font-size: 0.9rem;
    padding: 0.2rem 0.5rem;
    cursor: pointer;
    border-radius: 4px;
  }
  .dev-btn:hover { opacity: 0.7; }
</style>
