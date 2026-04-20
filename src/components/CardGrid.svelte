<script lang="ts">
  import { game, handleCardClick } from '../lib/state.svelte';
  import Card from './Card.svelte';

  const isChill = $derived(game.mode === 'chill');
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
          class:chill={isChill}
          style="--deal-delay:{entry.dealDelay}ms; --remove-delay:{entry.removeDelay}ms"
        >
          <Card entry={cardEntry} onclick={() => handleCardClick(entry.id)} />
        </div>
      {/if}
    </div>
  {/each}
</main>

<style>
  #card-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 1fr;
    gap: 8px;
    padding: 0 10px 10px 10px;
    flex: 1;
    min-height: 0;
  }

  @media (min-width: 520px) {
    #card-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 0 14px 14px 14px;
    }
  }

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

  @keyframes dealOutChill {
    from {
      opacity: 1;
      translate: 0 0;
      scale: 1;
    }
    to {
      opacity: 0;
      translate: 0 -24px;
      scale: 0.93;
    }
  }

  .card-inner.dealing {
    animation: dealIn var(--deal-duration) var(--deal-delay) both cubic-bezier(0.33, 1, 0.68, 1);
  }

  .card-inner.removing {
    animation: dealOut var(--remove-duration) var(--remove-delay) forwards;
  }

  .card-inner.chill.removing {
    animation: dealOutChill var(--remove-duration) var(--remove-delay) forwards cubic-bezier(0.4, 0, 0.6, 1);
  }
</style>
