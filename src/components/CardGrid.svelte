<script lang="ts">
  import { game, handleCardClick } from '../lib/state.svelte';
  import Card from './Card.svelte';
</script>

<main id="card-grid">
  {#each game.board as entry (entry.id)}
    <!--
      .card-slot is a persistent grid cell that never transitions out.
      The inner {#if} controls whether the card content is shown.
      'dealing' and 'removing' keep the card mounted so CSS animations run.
    -->
    <div class="card-slot">
      {#if game.cardsVisible && entry.card !== null && entry.status !== 'placeholder'}
        {@const cardEntry = entry as typeof entry & { card: NonNullable<typeof entry.card> }}
        <div
          class="card-inner"
          class:dealing={entry.status === 'dealing'}
          class:removing={entry.status === 'removing'}
          style="--deal-delay:{entry.dealDelay}ms; --remove-delay:{entry.removeDelay}ms"
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
    opacity: 1;
  }

  .card-inner > :global(.card) {
    flex: 1;
  }

  @keyframes dealIn {
    from {
      opacity: 0;
      translate: 0 -8px;
      scale: 0.95;
    }
    to {
      opacity: 1;
      translate: 0 0;
      scale: 1;
    }
  }

  @keyframes dealOut {
    from {
      opacity: 1;
      scale: 1;
    }
    to {
      opacity: 0;
      scale: 0.9;
    }
  }

  .card-inner.dealing {
    animation: dealIn var(--deal-duration) var(--deal-delay) both cubic-bezier(0.33, 1, 0.68, 1);
  }

  .card-inner.removing {
    animation: dealOut var(--remove-duration) var(--remove-delay) forwards;
  }
</style>
