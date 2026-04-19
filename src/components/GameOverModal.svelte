<script>
  import { gameOver, newGame } from '../lib/stores.js';
  import { formatTime } from '../lib/game.js';

  function playAgain() {
    gameOver.set(null);
    newGame();
  }
</script>

{#if $gameOver}
  <div id="overlay">
    <div id="modal">
      <h2 id="modal-title">{$gameOver.title}</h2>
      <p id="final-time-display">{formatTime($gameOver.time)}</p>
      <h3>Top Times</h3>
      <ol id="leaderboard-list">
        {#each $gameOver.scores as s, i}
          <li class:current-score={i === $gameOver.currentIdx}>
            {i + 1}. {formatTime(s)}
          </li>
        {/each}
      </ol>
      <button id="play-again-btn" onclick={playAgain}>Play Again</button>
    </div>
  </div>
{/if}
