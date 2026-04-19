// Svelte action for syncing a class name onto document.body.
// Usage: <div use:bodyClass={$theme}></div>
// The node argument is intentionally ignored — we always target document.body.
export function bodyClass(node, className) {
  document.body.className = className;
  return {
    update(newClassName) {
      document.body.className = newClassName;
    },
  };
}
