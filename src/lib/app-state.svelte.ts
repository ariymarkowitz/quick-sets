import { MODE_TIMINGS } from './constants.js';
import type { Game } from './Game.svelte.js';
import type { GameMode, GameOverInfo, AnimSettings } from './Game.svelte.js';

export type { GameMode, GameOverInfo, AnimSettings };

export type Phase =
  | { kind: 'intro' }
  | { kind: 'playing' }
  | { kind: 'pausedMenu' }
  | { kind: 'pausedTab' }
  | { kind: 'over'; info: GameOverInfo };

export type PendingAction = 'newGame' | 'resumePlay';

class AppState {
  phase: Phase = $state({ kind: 'intro' });
  mode: GameMode = $state('chill');
  scores: number[] = $state([]);
  pendingAction: PendingAction | null = $state(null);
  cardsExiting: boolean = $state(false);
  game: Game | null = $state(null);

  animSettings: AnimSettings = $derived(MODE_TIMINGS[this.mode]);

  running = $derived(this.phase.kind === 'playing');
  paused = $derived(this.phase.kind === 'pausedMenu' || this.phase.kind === 'pausedTab');
  gameActive = $derived(this.running || this.paused);
  timePaused = $derived(!this.running);

  menuOpen = $derived(this.phase.kind === 'intro' || this.phase.kind === 'pausedMenu');
  gameOver = $derived<GameOverInfo | null>(this.phase.kind === 'over' ? this.phase.info : null);

  cardsShown = $derived(this.phase.kind === 'playing' || this.phase.kind === 'pausedTab');
  cardsMounted = $derived(this.cardsShown || this.cardsExiting);

  canShowModal = $derived(this.pendingAction === null && !this.cardsExiting);
}

export const app = new AppState();
