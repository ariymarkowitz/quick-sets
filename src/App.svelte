<script lang="ts">
  import { untrack } from 'svelte';
  import Header from './components/Header.svelte';
  import CardGrid from './components/CardGrid.svelte';
  import GameOverModal from './components/GameOverModal.svelte';
  import MenuModal from './components/MenuModal.svelte';
  import SvgDefs from './components/SvgDefs.svelte';
  import { app } from './lib/app-state.svelte';
  import { Game } from './lib/game-state.svelte';
  import { getScores, getMode, setMode, saveScore as persistScore } from './lib/storage';
  import { VICTORY_MESSAGES } from './lib/constants';

  app.scores = getScores();
  app.mode = getMode();

  // Modal close handshake: closeModal sets viewTransition='modalExiting' and
  // returns a promise resolved by the Modal's onclose callback (fired after
  // its exit animation ends). Shape is constrained by Modal.svelte's API.
  let closeResolver: (() => void) | null = null;
  function closeModal(): Promise<void> {
    if (!app.modalOpen) return Promise.resolve();
    app.viewTransition = 'modalExiting';
    return new Promise(res => { closeResolver = res; });
  }
  function onModalClosed(): void {
    const r = closeResolver;
    closeResolver = null;
    r?.();
  }

  // Per-game lifecycle. The keyed effect owns the Game: when gameCounter
  // flips, its cleanup cascades through Game's internal $effects (resolution
  // timeout, toast timeout, timer interval), and a fresh Game is built.
  let gameCounter = $state(0);

  $effect(() => {
    const counter = gameCounter;
    if (counter === 0) return;
    app.game = new Game({
      getRunning: () => app.running,
      getTimePaused: () => app.timePaused,
      getViewTransition: () => app.viewTransition,
      getAnimSettings: () => app.animSettings,
      onEndGame: ({ time, disqualified }) => {
        const title = VICTORY_MESSAGES[Math.floor(Math.random() * VICTORY_MESSAGES.length)]!;
        const scores = disqualified ? getScores() : persistScore(time);
        const currentIdx = disqualified ? -1 : scores.indexOf(time);
        app.scores = scores;
        app.phase = { kind: 'over', info: { title, time, currentIdx, disqualified } };
      },
    });
    return () => { app.game = null; };
  });

  async function newGame(): Promise<void> {
    await closeModal();
    gameCounter++;
    app.phase = { kind: 'playing' };
  }

  function openMenu(): void {
    if (app.phase.kind === 'playing') {
      app.phase = { kind: 'pausedMenu' };
    }
  }

  async function closeMenu(): Promise<void> {
    if (app.phase.kind !== 'pausedMenu' || app.viewTransition !== null) return;
    await closeModal();
    app.phase = { kind: 'playing' };
    app.game?.triggerResumeDeal();
  }

  $effect(() => setMode(app.mode));

  $effect(() => {
    const onChange = () => {
      if (app.phase.kind === 'playing' && document.hidden) {
        app.phase = { kind: 'pausedTab' };
      } else if (app.phase.kind === 'pausedTab' && !document.hidden) {
        app.phase = { kind: 'playing' };
      }
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  });

  $effect.pre(() => {
    if (!app.modalOpen && app.viewTransition === 'modalExiting') {
      app.viewTransition = null;
    }
  });

  $effect.pre(() => {
    if (app.cardsShown) return;
    const { count, duration } = untrack(() => {
      const count = app.game?.activeEntries.length ?? 0;
      const { fastStagger, removeDuration } = app.animSettings;
      return {
        count,
        duration: Math.max(0, count - 1) * fastStagger + removeDuration,
      };
    });
    if (count === 0) return;
    app.viewTransition = 'cardsExiting';
    const id = setTimeout(() => { app.viewTransition = null; }, duration);
    return () => {
      clearTimeout(id);
      app.viewTransition = null;
    };
  });

  $effect(() => {
    const root = document.documentElement.style;
    root.setProperty('--deal-duration', `${app.animSettings.dealDuration}ms`);
    root.setProperty('--remove-duration', `${app.animSettings.removeDuration}ms`);
    root.setProperty('--shake-duration', `${app.animSettings.shakeDuration}ms`);
  });
</script>

<SvgDefs />
<div id="game">
  <Header {openMenu} {closeMenu} />
  <CardGrid />
  <GameOverModal {newGame} {onModalClosed} />
  <MenuModal {newGame} {closeMenu} {onModalClosed} />
</div>
