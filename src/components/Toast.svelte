<script lang="ts">
  import { app } from '../lib/AppState.svelte';
  
  const toast = $derived(app.game?.toast ?? '')
  let displayed = $state('');
  $effect(() => {
    if (toast) displayed = toast;
  });
</script>

<div id="message-toast" class:hidden={!toast}>{displayed}</div>

<style>
  #message-toast {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    text-align: center;
    padding: 7px 16px;
    min-height: 34px;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-muted);
    transition: opacity var(--dur-slow) ease;
  }

  #message-toast.hidden {
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--dur-slow) ease, visibility 0s var(--dur-slow);
  }
</style>
