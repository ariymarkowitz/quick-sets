<script>
  import { game, handleCardClick } from '../lib/state.svelte.js';
  import Card from './Card.svelte';
</script>

<main id="card-grid">
  {#each game.board as entry (entry.id)}
    <Card {entry} onclick={() => handleCardClick(entry.id)} />
  {/each}
</main>
