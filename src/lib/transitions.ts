import { cubicOut } from 'svelte/easing';

export function flyFromTop(_node: Element, { duration = 500, easing = cubicOut }: { duration?: number; easing?: (t: number) => number } = {}) {
  return {
    duration,
    easing,
    css: (_t: number, u: number) => `transform: translateY(${-u * 1200}px);`,
  };
}
