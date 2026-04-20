<script lang="ts">
  import { game } from '../lib/state.svelte';
</script>

<div id="message-toast" class:hidden={!game.toast}>{game.toast}</div>

<style>
  #message-toast {
    text-align: center;
    padding: 7px 16px;
    min-height: 34px;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-muted);
    transition: opacity 0.3s ease;
  }

  #message-toast.hidden {
    opacity: 0;
    pointer-events: none;
  }
</style>
