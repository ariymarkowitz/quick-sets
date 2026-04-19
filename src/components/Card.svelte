<script>
  import {
    CARD_W, CARD_H, SHAPE_W, SHAPE_PAD_X, SHAPE_SCALE,
    SHAPE_DATA, SHAPE_SLOT_H,
  } from '../lib/constants.js';

  let { entry, onclick } = $props();

  function onkeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onclick();
    }
  }
</script>

<div
  class="card"
  class:selected={entry.status === 'selected'}
  class:valid={entry.status === 'valid'}
  class:invalid={entry.status === 'invalid'}
  class:dealing={entry.status === 'dealing'}
  class:removing={entry.status === 'removing'}
  role="button"
  tabindex="0"
  {onclick}
  {onkeydown}
>
  <svg viewBox="0 0 {CARD_W} {CARD_H}" class="card-svg" preserveAspectRatio="xMidYMid meet">
    {#each Array.from({ length: entry.card.number }, (_, i) => i) as i}
      {@const shapeH = SHAPE_DATA[entry.card.shape].h * SHAPE_SCALE}
      {@const startY = (CARD_H - (entry.card.number - 1) * SHAPE_SLOT_H) / 2}
      {@const ty = startY + i * SHAPE_SLOT_H - shapeH / 2}
      <use
        href="#shape-{entry.card.shape}"
        x={SHAPE_PAD_X}
        y={ty}
        width={SHAPE_W}
        height={shapeH}
        class="shading-{entry.card.fill} color-{entry.card.color}"
      />
    {/each}
  </svg>
</div>
