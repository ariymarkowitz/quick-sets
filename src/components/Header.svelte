<script lang="ts">
  import { game, openMenu, closeMenu, devAutoMatch, devSkipToEnd, useHint } from '../lib/state.svelte';
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
      <button id="hint-btn" aria-label="Hint" title="Hint (disables leaderboard)" onclick={useHint}></button>
      <button id="pause-btn" aria-label={game.menuOpen ? 'Resume' : 'Pause'} title={game.menuOpen ? 'Resume' : 'Pause'} onclick={game.menuOpen ? closeMenu : openMenu}></button>
    {/if}
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

  .header-group {
    height: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
  }

  .header-group button {
    height: 100%;
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
    gap: 0.4rem;
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

  #hint-btn,
  #pause-btn {
    width: 34px;
    height: 34px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  #hint-btn::before,
  #pause-btn::before {
    content: '';
    display: block;
    width: 1rem;
    height: 1rem;
    background-color: var(--text);
    transition: background-color 0.15s ease;
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

  .dev-btn {
    background: transparent;
    border: 1px dashed var(--border, #888);
    color: inherit;
    font-size: 1rem;
    padding: 0.2rem 0.5rem;
    cursor: pointer;
    border-radius: 4px;
  }

  .dev-btn:hover { opacity: 0.7; }
</style>
