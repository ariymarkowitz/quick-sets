## Guidelines for reactive architecture

The mental model: **scopes are the persistent, identity-bearing part of a reactive system; effects are transient function bodies attached to them.** A scope (a component instance, an `$effect.root`, or a class/factory instance constructed in one) has identity and owns cleanup — disposing it cascades teardown through everything below. An effect's function body just runs, registers teardown, returns; the next run is a fresh execution. What persists between runs isn't the effect, it's the scope.

So the productive question is usually "what scope owns this, and is that the right scope for its lifetime?" — not "what effects do I need?"

### Reactive modules

A class or factory whose constructor calls `$effect`, takes getter props, and exposes state and methods is a component without a template. When instantiated inside an ambient reactive scope, its effects are owned by that scope and torn down with it. This is the right shape for stores, controllers, view models, and resource managers.

Canonical examples in this project: `GameState` in [src/lib/state.svelte.ts](src/lib/state.svelte.ts), `createTimer` in [src/lib/timer.svelte.ts](src/lib/timer.svelte.ts).

**Pass props as getters, not unwrapped values**, so reactivity crosses the boundary instead of being snapshotted at construction:

```ts
// ❌ snapshotted — `paused` never updates inside the module
createTimer(game.paused)

// ✅ reactive — the module re-reads on every access
createTimer(() => game.paused)
```

Reach for this pattern when state, methods, and effects genuinely belong together. If a class has no real state or methods and exists only to hold effects, a plain function inside an effect is usually cleaner. Test: if the effects were removed, would the rest still want to be a class?

### Rules

- **Effects that set up external resources must return a cleanup.** Subscriptions, listeners, timers, DOM handles — without a returned teardown, scope disposal has nothing to cascade.

  ```ts
  $effect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  });
  ```

- **An effect that assigns to `$state` is almost always a `$derived` in disguise.** `$derived` is for computing values from reactive state; `$effect` is for side effects on the world outside the reactive graph.

  ```ts
  // ❌
  let doubled = $state(0);
  $effect(() => { doubled = count * 2; });

  // ✅
  let doubled = $derived(count * 2);
  ```

- **Reactive logic that needs to outlive a component belongs in an `$effect.root`**, and whoever creates the root owns the disposer.

- **Group behaviors that share a fate under one scope.** Ownership only does its job when lifetime boundaries match.
