<script lang="ts">
  import { game, newGame, runPendingAction } from '../lib/state.svelte';
  import { formatTime } from '../lib/game';
  import Modal from './Modal.svelte';

  function onClose() {
    runPendingAction();
  }
</script>

<Modal open={game.modalVisible && !!game.gameOver} onclose={onClose}>
  <h2 id="modal-title">{game.gameOver?.title}</h2>
  <p id="final-time-display">{formatTime(game.gameOver?.time ?? 0)}</p>
  {#if game.gameOver?.disqualified}
    <p class="disqualified-note">Hint used — time not saved to leaderboard</p>
  {/if}
  <h3>Top Times</h3>
  <ol id="leaderboard-list">
    {#each game.gameOver?.scores ?? [] as s, i}
      <li class:current-score={i === game.gameOver?.currentIdx}>
        {i + 1}. {formatTime(s)}
      </li>
    {/each}
  </ol>
  <button id="play-again-btn" onclick={newGame}>Play Again</button>
</Modal>

<style>
  #final-time-display {
    font-size: 2.8rem;
    font-weight: 700;
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
