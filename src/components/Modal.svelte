<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import { cubicIn, cubicOut } from 'svelte/easing';
  import { flyFromTop } from '../lib/transitions';

  let { open, duration = 1000, onclose, children }: {
    open: boolean;
    duration?: number;
    onclose?: () => void;
    children: Snippet;
  } = $props();
</script>

{#if open}
  <div id="overlay"
    in:fade={{ duration, easing: cubicOut }}
    out:fade={{ duration, easing: cubicIn }}
  >
  </div>
{/if}
{#if open}
  <div id="modal-positioner">
    <div id="modal"
      in:flyFromTop={{ duration, easing: cubicOut }}
      out:flyFromTop={{ duration, easing: cubicIn }}
      onoutroend={onclose}
    >
      {@render children()}
    </div>
  </div>
{/if}
