<script lang="ts">
  import {
    CARD_W, CARD_H, SHAPE_W, SHAPE_PAD_X, SHAPE_SCALE,
    SHAPE_DATA, SHAPE_SLOT_H,
  } from '../lib/constants';
  import { app } from '../lib/AppState.svelte';
  import type { Highlight } from '../lib/Game.svelte';
  import type { Card } from '../lib/game-utils';

  type Props = {
    card: Card;
    highlight: Highlight;
    onclick: () => void;
  };

  let { card, highlight, onclick }: Props = $props();

  function onpointerdown(e: PointerEvent) {
    e.preventDefault();
    onclick();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onclick();
    }
  }
</script>

<div
  class={['card', highlight, app.mode]}
  role="button"
  tabindex="0"
  {onpointerdown}
  {onkeydown}
>
  <svg viewBox="0 0 {CARD_W} {CARD_H}" class="card-svg" preserveAspectRatio="xMidYMid meet">
    {#each [...Array(card.number).keys()] as i}
      {@const shapeH = SHAPE_DATA[card.shape].h * SHAPE_SCALE}
      {@const startY = (CARD_H - (card.number - 1) * SHAPE_SLOT_H) / 2}
      {@const ty = startY + i * SHAPE_SLOT_H - shapeH / 2}
      <use
        href="#shape-{card.shape}"
        x={SHAPE_PAD_X}
        y={ty}
        width={SHAPE_W}
        height={shapeH}
        class="shading-{card.fill} color-{card.color}"
      />
    {/each}
  </svg>
</div>

<style>
  .card {
    background: var(--card-bg);
    border: 2.5px solid var(--card-border);
    border-radius: 14px;
    cursor: pointer;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 7%;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    box-shadow: 0 2px 8px var(--shadow);
    transition-property: opacity, transform, box-shadow, border-color, background-color;
    transition-duration: 0.12s, 0.12s, 0.15s, 0.2s, 0.3s;
    transition-timing-function: ease, ease, ease, ease, ease;
    position: relative;
    overflow: hidden;
    container-type: size;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 14px var(--shadow-hover);
  }

  .card.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow), 0 5px 14px var(--shadow-hover);
    transform: translateY(-4px);
  }

  .card.valid {
    border-color: var(--valid) !important;
    box-shadow: 0 0 0 3px var(--valid-glow), 0 5px 16px var(--shadow-hover) !important;
    transform: translateY(-4px);
  }

  .card.valid.chill {
    animation: pulse-valid 0.3s ease forwards;
  }

  .card.invalid {
    border-color: var(--invalid) !important;
    box-shadow: 0 0 0 3px var(--invalid-glow) !important;
    animation: shake var(--shake-duration, 0.15s) ease forwards;
  }

  .card.hint {
    border-color: var(--hint-highlight) !important;
    box-shadow: 0 0 0 3px var(--hint-glow), 0 5px 14px var(--shadow-hover) !important;
    transform: translateY(-2px);
  }

  .card-svg {
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
  }

  /* Rotate symbols sideways when the card is landscape */
  @container (aspect-ratio > 1) {
    .card-svg {
      width: 100cqh;
      height: 100cqw;
      transform: rotate(90deg);
    }
  }

  @keyframes pulse-valid {
    0%   { scale: 1; }
    50%  { scale: 1.04; }
    100% { scale: 1; }
  }

  @keyframes shake {
    0%, 100% { translate: 0 0; }
    25%      { translate: -5px 0; }
    75%      { translate: 5px 0; }
  }
</style>
