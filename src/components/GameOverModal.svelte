<script lang="ts">
  import { game, newGame } from '../lib/state.svelte';
  import { formatTime } from '../lib/game';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  function playAgain() {
    game.gameOver = null;
  }

  function overlayTransition(_node: Element, { duration = 350 } = {}) {
    return {
      duration,
      css: (t: number) => `
        opacity: ${t};
        backdrop-filter: blur(${t * 5}px);
        -webkit-backdrop-filter: blur(${t * 5}px);
      `
    };
  }
</script>

{#if game.gameOver}
  <div id="overlay" transition:overlayTransition={{ duration: 350 }}>
    <div id="modal" transition:fly={{ y: -60, duration: 450, easing: cubicOut }} onoutroend={newGame}>
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
