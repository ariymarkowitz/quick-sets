<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import CardGrid from './components/CardGrid.svelte';
  import GameOverModal from './components/GameOverModal.svelte';
  import SvgDefs from './components/SvgDefs.svelte';
  import { newGame } from './lib/state.svelte';

  onMount(() => { newGame(); });
</script>

<SvgDefs />
<div id="game">
  <Header />
  <CardGrid />
  <GameOverModal />
</div>
