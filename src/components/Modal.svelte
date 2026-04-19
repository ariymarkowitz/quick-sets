<script lang="ts">
  import type { Snippet } from 'svelte';
  import { dealIn, dealOut } from '../lib/transitions';

  let { open, onclose, children }: {
    open: boolean;
    onclose?: () => void;
    children: Snippet;
  } = $props();
</script>

{#if open}
  <div id="modal-positioner">
    <div id="modal"
      in:dealIn
      out:dealOut
      onoutroend={onclose}
    >
      {@render children()}
    </div>
  </div>
{/if}
