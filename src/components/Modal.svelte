<script lang="ts">
  import type { Snippet } from 'svelte';

  let { open, onclose, children }: {
    open: boolean;
    onclose?: () => void;
    children: Snippet;
  } = $props();

  let closing = $state(false);
  let visible = $state(false);

  $effect(() => {
    if (open) {
      closing = false;
      visible = true;
    } else if (visible && !closing) {
      closing = true;
    }
  });

  function onAnimationEnd() {
    if (closing) {
      visible = false;
      closing = false;
      onclose?.();
    }
  }
</script>

{#if visible}
  <div id="modal-positioner">
    <div id="modal"
      class:closing
      onanimationend={onAnimationEnd}
    >
      {@render children()}
    </div>
  </div>
{/if}

<style>
  @keyframes modalIn {
    from { opacity: 0; translate: 0 -8px; scale: 0.95; }
    to   { opacity: 1; translate: 0 0;    scale: 1; }
  }

  @keyframes modalOut {
    from { opacity: 1; scale: 1; }
    to   { opacity: 0; scale: 0.9; }
  }

  #modal {
    animation: modalIn 500ms cubic-bezier(0.33, 1, 0.68, 1) both;
  }

  #modal.closing {
    animation: modalOut 200ms forwards;
  }
</style>
