<script>
  import { toast } from '../lib/stores.js';
</script>

<div id="message-toast" class:hidden={!$toast}>{$toast}</div>
