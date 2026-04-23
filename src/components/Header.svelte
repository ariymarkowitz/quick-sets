<script lang="ts">
  import { game, openMenu, closeMenu, devSkipToEnd, useHint } from '../lib/state.svelte';
  import { formatTime } from '../lib/game';
  import Toast from './Toast.svelte';

  const isDev = import.meta.env.DEV;
</script>

<header>
  <div class="header-group">
    <span id="timer">{formatTime(game.timer.sample)}</span>
    <span id="deck-count">
      <span class="header-icon" aria-hidden="true"></span>
      <span id="deck-count-num">{game.deck.length}</span>
    </span>
  </div>
  <div class="toast-wrapper"><Toast /></div>
  <div class="header-group" class:hidden={!game.gameActive}>
      {#if isDev}
        <button id="skip-btn" title="Skip to end" onclick={devSkipToEnd}></button>
      {/if}
      <button id="hint-btn" aria-label="Hint" title="Hint (disables leaderboard)" onclick={useHint}></button>
      <button id="pause-btn" aria-label={game.menuOpen ? 'Resume' : 'Pause'} title={game.menuOpen ? 'Resume' : 'Pause'} onclick={game.menuOpen ? closeMenu : openMenu}></button>
  </div>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    position: sticky;
    top: 0;
    z-index: 10;
    gap: 8px;
  }

  .toast-wrapper {
    flex: 1;
    align-self: stretch;
    position: relative;
    overflow: visible;
  }

  .header-group {
    height: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
    transition: opacity 0.15s ease;
  }

  .header-group.hidden {
    opacity: 0;
    pointer-events: none;
  }

  .header-group button {
    width: 34px;
    height: 34px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .header-group button::before {
    content: '';
    display: block;
    width: 1rem;
    height: 1rem;
    background-color: var(--text);
    transition: background-color 0.15s ease;
  }

  #timer {
    font-size: 1rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text);
    transition: color 0.15s ease;
    min-width: 3ch;
  }

  #deck-count {
    font-size: 1rem;
    color: var(--text-muted);
    transition: color 0.15s ease;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
  }

  .header-icon {
    display: inline-block;
    width: 1.5em;
    height: 1.5em;
    background-color: currentColor;
    transition: background-color 0.15s ease;
    -webkit-mask: url('../icons/mdi--cards.svg') no-repeat center / contain;
    mask: url('../icons/mdi--cards.svg') no-repeat center / contain;
  }

  #hint-btn::before {
    -webkit-mask: url('../icons/mdi--lightbulb-on.svg') no-repeat center / contain;
    mask: url('../icons/mdi--lightbulb-on.svg') no-repeat center / contain;
  }

  #pause-btn::before {
    -webkit-mask: url('../icons/mdi--pause.svg') no-repeat center / contain;
    mask: url('../icons/mdi--pause.svg') no-repeat center / contain;
  }

  #pause-btn[aria-label="Resume"]::before {
    -webkit-mask-image: url('../icons/mdi--play.svg');
    mask-image: url('../icons/mdi--play.svg');
  }

  #skip-btn {
    background: transparent;
    border: 1px dashed var(--border, #888);
    color: inherit;
  }

  #skip-btn::before {
    content: '⏭';
    width: auto;
    height: auto;
    background: none;
  }

  #skip-btn:hover { opacity: 0.7; }
</style>
