<script lang="ts">
  import { game } from '../lib/state.svelte';
  import { formatTime } from '../lib/game';
  import Modal from './Modal.svelte';

  function playAgain() {
    game.gameOver = null;
  }

  function afterClose() {
    game.menuOpen = true;
  }
</script>

<Modal open={!!game.gameOver} onclose={afterClose}>
  <h2 id="modal-title">{game.gameOver?.title}</h2>
  <p id="final-time-display">{formatTime(game.gameOver?.time ?? 0)}</p>
  <h3>Top Times</h3>
  <ol id="leaderboard-list">
    {#each game.gameOver?.scores ?? [] as s, i}
      <li class:current-score={i === game.gameOver?.currentIdx}>
        {i + 1}. {formatTime(s)}
      </li>
    {/each}
  </ol>
  <button id="play-again-btn" onclick={playAgain}>Play Again</button>
</Modal>
