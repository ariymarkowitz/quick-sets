<script lang="ts">
  import { app } from '../lib/AppState.svelte';
  import Card from './Card.svelte';

  let { onCardsExited }: { onCardsExited: () => void } = $props();

  const isChill = $derived(app.mode === 'chill');

  // Count exit-animation completions during cardsExiting.
  let exitedCount = 0;
  $effect(() => {
    if (!app.cardsExiting) exitedCount = 0;
  });

  function handleAnimationEnd() {
    if (!app.cardsExiting) return;
    exitedCount++;
    const total = app.game?.activeEntries.length ?? 0;
    if (exitedCount >= total) onCardsExited();
  }
</script>

<main id="card-grid-wrap">
  <div id="card-grid">
    {#if app.cardsMounted}
      {#each app.game?.board ?? [] as entry (entry.id)}
        <div class="card-slot">
          {#if entry.card !== null}
            {@const v = app.game?.cardStatus(entry) ?? { transition: null, highlight: null }}
            <div
              class="card-inner"
              class:dealing={v.transition?.type === 'dealing'}
              class:removing={v.transition?.type === 'removing'}
              class:chill={isChill}
              style="--delay:{v.transition?.delay}ms"
              onanimationend={handleAnimationEnd}
            >
              <Card
                card={entry.card}
                highlight={v.highlight}
                onclick={() => app.game?.handleCardClick(entry.id)}
              />
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</main>

<style>
  #card-grid-wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    --pad: clamp(10px, calc(6px + 1vmin), 14px);
    padding: 0 var(--pad) var(--pad);
  }

  #card-grid {
    --cols: 3;
    --rows: 4;
    --card-w: 5;
    --card-h: 8;
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    grid-template-rows: repeat(var(--rows), 1fr);
    aspect-ratio: calc(var(--cols) * var(--card-w)) / calc(var(--rows) * var(--card-h));
    width: 100%;
    max-height: 100%;
    gap: min(2vmin, 12px);
  }

  /* Switch to 4×3 horizontal when the viewport is decisively wider than tall,
     or whenever the page hits its max width (desktop). */
  @media (min-aspect-ratio: 5/4), (min-width: 1000px) {
    #card-grid {
      --cols: 4;
      --rows: 3;
      --card-w: 8;
      --card-h: 5;
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
    animation: dealIn var(--deal-duration) var(--delay) both cubic-bezier(0.33, 1, 0.68, 1);
  }

  .card-inner.removing {
    animation: dealOut var(--remove-duration) var(--delay) forwards;
  }

  .card-inner.chill.removing {
    animation: dealOutChill var(--remove-duration) var(--delay) forwards cubic-bezier(0.4, 0, 0.6, 1);
  }
</style>
