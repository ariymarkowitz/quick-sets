<script lang="ts">
  import { game, handleCardClick } from '../lib/state.svelte';
  import Card from './Card.svelte';
</script>

<main id="card-grid">
  {#each game.board as entry (entry.id)}
    {#if entry.status === 'placeholder'}
      <div class="card-placeholder" aria-hidden="true"></div>
    {:else}
      {@const cardEntry = entry as typeof entry & { card: NonNullable<typeof entry.card> }}
      <Card entry={cardEntry} onclick={() => handleCardClick(entry.id)} />
    {/if}
  {/each}
</main>

<style>
  .card-placeholder {
    visibility: hidden;
    pointer-events: none;
  }
</style>
