<script>
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import CardGrid from './components/CardGrid.svelte';
  import GameOverModal from './components/GameOverModal.svelte';
  import SvgDefs from './components/SvgDefs.svelte';
  import { newGame } from './lib/stores.js';

  onMount(() => { newGame(); });
</script>

<SvgDefs />
<div id="app">
  <Header />
  <CardGrid />
  <GameOverModal />
</div>
