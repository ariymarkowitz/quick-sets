<script lang="ts">
  import { untrack } from 'svelte';
  import Header from './components/Header.svelte';
  import CardGrid from './components/CardGrid.svelte';
  import GameOverModal from './components/GameOverModal.svelte';
  import MenuModal from './components/MenuModal.svelte';
  import SvgDefs from './components/SvgDefs.svelte';
  import { app } from './lib/app-state.svelte';
  import { Game } from './lib/Game.svelte';
  import { getScores, getMode, setMode, saveScore as persistScore } from './lib/storage';
  import { VICTORY_MESSAGES } from './lib/constants';

  app.scores = getScores();
  app.mode = getMode();

  let gameCounter = $state(0);
  let modalAnimating = $state(false);

  $effect(() => {
    const counter = gameCounter;
    if (counter === 0) return;
    app.game = new Game({
      getRunning: () => app.running,
      getTimePaused: () => app.timePaused,
      getCardsExiting: () => app.cardsExiting,
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

  function newGame(): void {
    if (app.pendingAction === null) app.pendingAction = 'newGame';
  }

  function openMenu(): void {
    if (app.phase.kind === 'playing') {
      app.phase = { kind: 'pausedMenu' };
    }
  }

  function closeMenu(): void {
    if (app.phase.kind === 'pausedMenu' && app.pendingAction === null) {
      app.pendingAction = 'resumePlay';
    }
  }

  function onModalOpened(): void {
    modalAnimating = true;
  }

  function onModalClosed(): void {
    modalAnimating = false;
  }

  function onCardsExited(): void {
    app.cardsExiting = false;
  }

  $effect(() => {
    if (app.pendingAction !== null && !app.cardsExiting && !modalAnimating) {
      untrack(() => {
        const action = app.pendingAction;
        app.pendingAction = null;
        if (action === 'newGame') {
          gameCounter++;
          app.phase = { kind: 'playing' };
        } else if (action === 'resumePlay') {
          app.phase = { kind: 'playing' };
          app.game?.triggerResumeDeal();
        }
      });
    }
  });

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
    if (app.cardsShown) return;
    const count = untrack(() => app.game?.activeEntries.length ?? 0);
    if (count === 0) return;
    app.cardsExiting = true;
    return () => { app.cardsExiting = false; };
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
  <CardGrid {onCardsExited} />
  <GameOverModal {newGame} {onModalOpened} {onModalClosed} />
  <MenuModal {newGame} {closeMenu} {onModalOpened} {onModalClosed} />
</div>
