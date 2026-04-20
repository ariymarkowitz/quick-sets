<script lang="ts">
  import { game, handleCardClick } from '../lib/state.svelte';
  import { dealIn, dealOut } from '../lib/transitions';
  import Card from './Card.svelte';
</script>

<main id="card-grid">
  {#each game.board as entry (entry.id)}
    <!--
      .card-slot is a persistent grid cell that never transitions out.
      The inner {#if} controls whether the card content is shown,
      and carries the in:/out: transitions. This prevents layout shifts
      when cards exit — the slot holds its space while the card animates.
    -->
    <div class="card-slot">
      {#if game.cardsVisible && entry.card !== null && entry.status !== 'placeholder' && entry.status !== 'removing' && entry.status !== 'dealing'}
        {@const cardEntry = entry as typeof entry & { card: NonNullable<typeof entry.card> }}
        <div
          class="card-inner"
          in:dealIn={{ delay: entry.dealDelay }}
          out:dealOut={{ delay: entry.removeDelay }}
        >
          <Card entry={cardEntry} onclick={() => handleCardClick(entry.id)} />
        </div>
      {/if}
    </div>
  {/each}
</main>

<style>
  .card-slot {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .card-inner {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .card-inner > :global(.card) {
    flex: 1;
  }
</style>
