<script>
  import { game } from '../lib/state.svelte.js';
</script>

<div id="message-toast" class:hidden={!game.toast}>{game.toast}</div>
