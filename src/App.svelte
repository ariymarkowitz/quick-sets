<script lang="ts">
  import Header from './components/Header.svelte';
  import CardGrid from './components/CardGrid.svelte';
  import GameOverModal from './components/GameOverModal.svelte';
  import MenuModal from './components/MenuModal.svelte';
  import SvgDefs from './components/SvgDefs.svelte';
  import { animSettings } from './lib/state.svelte';

  $effect(() => {
    const root = document.documentElement.style;
    root.setProperty('--deal-duration', `${animSettings.dealDuration}ms`);
    root.setProperty('--remove-duration', `${animSettings.removeDuration}ms`);
  });
</script>

<SvgDefs />
<div id="game">
  <Header />
  <CardGrid />
  <GameOverModal />
  <MenuModal />
</div>
