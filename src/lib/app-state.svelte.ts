import { MODE_TIMINGS } from './constants.js';
import type { Game } from './game-state.svelte.js';
import type { GameMode, GameOverInfo, AnimSettings } from './game-state.svelte.js';

export type { GameMode, GameOverInfo, AnimSettings };

export type Phase =
  | { kind: 'intro' }
  | { kind: 'playing' }
  | { kind: 'pausedMenu' }
  | { kind: 'pausedTab' }
  | { kind: 'over'; info: GameOverInfo };

class AppState {
  phase: Phase = $state({ kind: 'intro' });
  mode: GameMode = $state('chill');
  scores: number[] = $state([]);
  viewTransition: 'cardsExiting' | 'modalExiting' | null = $state(null);
  game: Game | null = $state(null);

  animSettings: AnimSettings = $derived(MODE_TIMINGS[this.mode]);
  gameActive = $derived(
    this.phase.kind === 'playing' ||
    this.phase.kind === 'pausedMenu' ||
    this.phase.kind === 'pausedTab'
  );
  running = $derived(this.phase.kind === 'playing');
  paused = $derived(this.phase.kind === 'pausedMenu' || this.phase.kind === 'pausedTab');
  timePaused = $derived(this.paused || this.phase.kind === 'intro' || this.phase.kind === 'over');
  menuOpen = $derived(this.phase.kind === 'intro' || this.phase.kind === 'pausedMenu');
  gameOver = $derived<GameOverInfo | null>(this.phase.kind === 'over' ? this.phase.info : null);
  modalOpen = $derived(
    this.phase.kind === 'intro' || this.phase.kind === 'pausedMenu' || this.phase.kind === 'over'
  );
  cardsShown = $derived(this.phase.kind === 'playing' || this.phase.kind === 'pausedTab');
  cardsMounted = $derived(this.cardsShown || this.viewTransition === 'cardsExiting');
  modalVisible = $derived(this.modalOpen && this.viewTransition === null);
}

export const app = new AppState();
