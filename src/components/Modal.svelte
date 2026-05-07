<script lang="ts">
  import type { Snippet } from 'svelte';

  let { open, onOpen, onClose, children }: {
    open: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    children: Snippet;
  } = $props();

  let closing = $state(false);
  let visible = $state(false);

  $effect(() => {
    if (open) {
      if (!visible) onOpen?.();
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
      onClose?.();
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
  #modal-positioner {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 100;
    pointer-events: none;
  }

  #modal-positioner > #modal {
    pointer-events: auto;
  }

  #modal {
    background: var(--surface);
    border-radius: 20px;
    padding: var(--modal-padding);
    max-width: 360px;
    width: 100%;
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    text-align: center;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border);
    transition: background-color 0.3s ease, border 0.3s ease;
    animation: modalIn 500ms cubic-bezier(0.33, 1, 0.68, 1) both;
    
    display: flex;
    flex-direction: column;
  }

  #modal.closing {
    animation: modalOut 200ms forwards;
  }

  :global(#modal h3) {
    font-size: 0.78rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  @keyframes modalIn {
    from { opacity: 0; translate: 0 -8px; scale: 0.95; }
    to   { opacity: 1; translate: 0 0;    scale: 1; }
  }

  @keyframes modalOut {
    from { opacity: 1; scale: 1; }
    to   { opacity: 0; scale: 0.9; }
  }
</style>
