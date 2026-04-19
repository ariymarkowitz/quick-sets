<script>
  import { board, handleCardClick } from '../lib/stores.js';
  import Card from './Card.svelte';
</script>

<main id="card-grid">
  {#each $board as entry (entry.id)}
    <Card {entry} onclick={() => handleCardClick(entry.id)} />
  {/each}
</main>
