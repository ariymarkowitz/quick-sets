<script lang="ts">
  import Header from './components/Header.svelte';
  import CardGrid from './components/CardGrid.svelte';
  import GameOverModal from './components/GameOverModal.svelte';
  import MenuModal from './components/MenuModal.svelte';
  import SvgDefs from './components/SvgDefs.svelte';
  import { game } from './lib/state.svelte';

  $effect(() => {
    const root = document.documentElement.style;
    root.setProperty('--deal-duration', `${game.animSettings.dealDuration}ms`);
    root.setProperty('--remove-duration', `${game.animSettings.removeDuration}ms`);
    root.setProperty('--shake-duration', `${game.animSettings.shakeDuration}ms`);
  });
</script>

<SvgDefs />
<div id="game">
  <Header />
  <CardGrid />
  <GameOverModal />
  <MenuModal />
</div>
