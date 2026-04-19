<script>
  import { game, handleCardClick } from '../lib/state.svelte.js';
  import Card from './Card.svelte';
</script>

<main id="card-grid">
  {#each game.board as entry (entry.id)}
    {#if entry.status === 'placeholder'}
      <div class="card-placeholder" aria-hidden="true"></div>
    {:else}
      <Card {entry} onclick={() => handleCardClick(entry.id)} />
    {/if}
  {/each}
</main>

<style>
  .card-placeholder {
    visibility: hidden;
    pointer-events: none;
  }
</style>
