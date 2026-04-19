<script>
  import { SHAPE_DATA, COLOR_MAP, SHAPE_NATIVE_W } from '../lib/constants.js';
</script>

<svg class="hidden-svg" aria-hidden="true">
  <defs>
    {#each Object.entries(SHAPE_DATA) as [name, data]}
      <symbol id="shape-{name}" viewBox="0 0 {SHAPE_NATIVE_W} {data.h}" overflow="visible">
        <path d={data.d} />
      </symbol>
    {/each}
    {#each Object.entries(COLOR_MAP) as [name, color]}
      <pattern id="stripe-{name}" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="4" stroke={color} stroke-width="1.5" />
      </pattern>
    {/each}
  </defs>
</svg>
