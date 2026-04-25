<script lang="ts">
  import { app } from '../lib/app-state.svelte';
  import { formatTime } from '../lib/game';
  import Modal from './Modal.svelte';

  let { newGame, onModalClosed }: {
    newGame: () => void;
    onModalClosed: () => void;
  } = $props();

  function onClose() {
    onModalClosed();
  }
</script>

<Modal open={app.modalVisible && !!app.gameOver} {onClose}>
  <h2 id="modal-title">{app.gameOver?.title}</h2>
  <p id="final-time-display">{formatTime(app.gameOver?.time ?? 0)}</p>
  {#if app.gameOver?.disqualified}
    <p class="disqualified-note">Hint used — time not saved to leaderboard</p>
  {/if}
  <h3>Top Times</h3>
  <ol id="leaderboard-list">
    {#each app.scores as s, i}
      <li class:current-score={i === app.gameOver?.currentIdx}>
        {i + 1}. {formatTime(s)}
      </li>
    {/each}
  </ol>
  <button id="play-again-btn" onclick={newGame}>Play Again</button>
</Modal>

<style>
  #modal-title {
    margin-bottom: 12px;
  }

  #final-time-display {
    font-size: 2.8rem;
    font-weight: 800;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    margin-bottom: 20px;
  }

  .disqualified-note {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 12px;
  }
</style>
