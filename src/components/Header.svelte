<script lang="ts">
  // TODO [Claude]: Timer keeps going while paused
  import { game, openMenu, devAutoMatch, devSkipToEnd } from '../lib/state.svelte';
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
    {#if game.gameActive}
      <button id="pause-btn" aria-label="Pause" title="Pause" onclick={openMenu}>⏸</button>
    {/if}
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
