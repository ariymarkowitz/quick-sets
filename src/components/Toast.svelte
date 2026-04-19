<script lang="ts">
  import { game } from '../lib/state.svelte';
</script>

<div id="message-toast" class:hidden={!game.toast}>{game.toast}</div>
