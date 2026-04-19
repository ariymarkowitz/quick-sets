import type { Action } from 'svelte/action';

// Svelte action for syncing a class name onto document.body.
// Usage: <div use:bodyClass={theme}></div>
// The node argument is intentionally ignored — we always target document.body.
export const bodyClass: Action<HTMLElement, string> = (_node, className) => {
  document.body.className = className ?? '';
  return {
    update(newClassName: string) {
      document.body.className = newClassName;
    },
  };
};
