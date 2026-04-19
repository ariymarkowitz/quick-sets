import { cubicOut } from 'svelte/easing';
import { animSettings } from './state.svelte.js';

export function dealIn(_node: Element, { delay = 0, duration }: { delay?: number; duration?: number } = {}) {
  const d = duration ?? animSettings.dealDuration;
  return {
    delay,
    duration: d,
    css: (t: number) => {
      const e = cubicOut(t);
      return `opacity:${e};translate:0 ${(1 - e) * -8}px;scale:${0.95 + 0.05 * e}`;
    },
  };
}

export function dealOut(_node: Element, { delay = 0, duration }: { delay?: number; duration?: number } = {}) {
  const d = duration ?? animSettings.removeDuration;
  return {
    delay,
    duration: d,
    css: (t: number) => `opacity:${t};scale:${0.9 + 0.1 * t}`,
  };
}
