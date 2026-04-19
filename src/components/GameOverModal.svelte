<script lang="ts">
  import { game, newGame } from '../lib/state.svelte';
  import { formatTime } from '../lib/game';

  function playAgain() {
    game.gameOver = null;
    newGame();
  }
</script>

{#if game.gameOver}
  <div id="overlay">
    <div id="modal">
      <h2 id="modal-title">{game.gameOver.title}</h2>
      <p id="final-time-display">{formatTime(game.gameOver.time)}</p>
      <h3>Top Times</h3>
      <ol id="leaderboard-list">
        {#each game.gameOver.scores as s, i}
          <li class:current-score={i === game.gameOver.currentIdx}>
            {i + 1}. {formatTime(s)}
          </li>
        {/each}
      </ol>
      <button id="play-again-btn" onclick={playAgain}>Play Again</button>
    </div>
  </div>
{/if}
