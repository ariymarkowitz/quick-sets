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

export type PendingAction = 'newGame' | 'resumePlay';

class AppState {
  phase: Phase = $state({ kind: 'intro' });
  mode: GameMode = $state('chill');
  scores: number[] = $state([]);
  // Set by user actions to begin a modal-out → phase-commit handshake.
  // Cleared by App's onModalClosed once the Modal's exit animation ends.
  pendingAction: PendingAction | null = $state(null);
  // True while the card grid is animating out after phase leaves cardsShown.
  // CardGrid clears it via onCardsExited once the last card's animationend lands.
  cardsExiting: boolean = $state(false);
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
  cardsMounted = $derived(this.cardsShown || this.cardsExiting);
  modalVisible = $derived(this.modalOpen && this.pendingAction === null);
}

export const app = new AppState();
