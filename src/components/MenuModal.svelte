<script lang="ts">
  import { game, newGame, closeMenu, onModalClosed } from '../lib/state.svelte';
  import { formatTime } from '../lib/game';
  import { getTheme, toggleTheme, type Theme } from '../lib/storage';
  import Modal from './Modal.svelte';

  type View = 'main' | 'help' | 'leaderboard';
  let view: View = $state('main');
  let theme: Theme = $state(getTheme());

  function onThemeToggle() {
    theme = toggleTheme();
  }

  function onClose() {
    onModalClosed();
    view = 'main';
  }
</script>

<Modal open={game.modalVisible && game.menuOpen} onclose={onClose}>
  {#if view === 'main'}
    <h2 id="modal-title">Quick Sets</h2>

    <div class="menu-row">
      <div class="segmented" role="group" aria-label="Game mode">
        <button
          type="button"
          class="segmented-btn"
          class:active={game.mode === 'chill'}
          onclick={() => (game.mode = 'chill')}
        ><span class="mode-icon tortoise-icon"></span>Chill</button>
        <button
          type="button"
          class="segmented-btn"
          class:active={game.mode === 'speedy'}
          onclick={() => (game.mode = 'speedy')}
        ><span class="mode-icon rabbit-icon"></span>Speedy</button>
      </div>
      <button
        id="menu-theme-toggle"
        class="menu-btn icon-btn"
        aria-label="Toggle theme"
        title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
        onclick={onThemeToggle}
      ></button>
    </div>

    <div class="menu-row">
      <button class="menu-btn" onclick={() => (view = 'help')}>How to Play</button>
      <button class="menu-btn" onclick={() => (view = 'leaderboard')}>Leaderboard</button>
    </div>

    <button id="play-again-btn" onclick={newGame}>
      {game.gameActive ? 'Restart' : 'Start'}
    </button>
    {#if game.gameActive}
      <button class="menu-btn resume-btn" onclick={closeMenu}>Resume</button>
    {/if}
  {:else if view === 'help'}
    <h2 id="modal-title">How to Play</h2>
    <div class="help-text">
      <p>Find a <strong>set</strong> of three cards where, for each of the four features, all cards match or all differ.</p>
      <ul>
        <li><strong>Number:</strong> 1, 2, or 3 shapes</li>
        <li><strong>Shape:</strong> diamond, oval, or squiggle</li>
        <li><strong>Shading:</strong> solid, striped, or open</li>
        <li><strong>Color:</strong> red, green, or purple</li>
      </ul>
      <p>Tap three cards to submit a set. Clear the deck as fast as you can.</p>
    </div>
    <button id="play-again-btn" onclick={() => (view = 'main')}>Back</button>
  {:else if view === 'leaderboard'}
    <h2 id="modal-title">Top Times</h2>
    {#if game.scores.length === 0}
      <p class="empty-scores">No times yet — finish a game to set a record.</p>
    {:else}
      <ol id="leaderboard-list">
        {#each game.scores as s, i}
          <li>{i + 1}. {formatTime(s)}</li>
        {/each}
      </ol>
    {/if}
    <button id="play-again-btn" onclick={() => (view = 'main')}>Back</button>
  {/if}
</Modal>

<style>

  #modal-title {
    margin-bottom: 20px;
  }

  .segmented {
    display: flex;
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    transition: border 0.3s ease;
  }

  .segmented-btn {
    flex: 1;
    background: var(--surface-alt);
    border: none;
    border-radius: 0;
    padding: 9px 0;
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
  }

  .mode-icon {
    display: inline-block;
    width: 1.3em;
    height: 1.3em;
    background-color: currentColor;
    flex-shrink: 0;

    transform: translateY(-1px);
  }

  .tortoise-icon {
    -webkit-mask: url('../icons/mdi--tortoise.svg') no-repeat center / contain;
    mask: url('../icons/mdi--tortoise.svg') no-repeat center / contain;
  }

  .rabbit-icon {
    -webkit-mask: url('../icons/mdi--rabbit.svg') no-repeat center / contain;
    mask: url('../icons/mdi--rabbit.svg') no-repeat center / contain;
  }

  .segmented-btn + .segmented-btn {
    border-left: 1px solid var(--border);
  }

  .segmented-btn.active {
    background: var(--accent);
    color: #fff;
  }

  .menu-row {
    display: flex;
    gap: 8px;
    margin-top: 18px;
    margin-bottom: 18px;
  }

  .menu-btn {
    flex: 1;
    padding: 10px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .icon-btn {
    flex: 0 0 auto;
    width: 42px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #menu-theme-toggle::before {
    content: '';
    display: block;
    width: 1rem;
    height: 1rem;
    background-color: var(--text);
    -webkit-mask: url('../icons/moon.svg') no-repeat center / contain;
    mask: url('../icons/moon.svg') no-repeat center / contain;
  }

  :global(body.dark) #menu-theme-toggle::before {
    -webkit-mask-image: url('../icons/sun.svg');
    mask-image: url('../icons/sun.svg');
  }

  .resume-btn {
    margin-top: 10px;
    width: 100%;
  }

  .help-text {
    text-align: left;
    margin-bottom: 20px;
    font-size: 0.92rem;
    line-height: 1.45;
    color: var(--text);
  }

  .help-text ul {
    margin-top: 10px;
    margin-bottom: 10px;
    padding-left: 20px;
  }

  .empty-scores {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 20px;
  }
</style>
