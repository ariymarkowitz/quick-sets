## Guidelines for reactive architecture

When writing reactive Svelte code, the mental model to hold is that scopes are the persistent, identity-bearing part of a reactive system, and effects are transient function bodies attached to them.

A scope (a component instance, an `$effect.root`, or a class instance constructed within one of these) is close to pure state: a node in an ownership tree, a list of children, a list of cleanup callbacks. It has identity — you can point to it, it persists across effect re-runs, and disposing it cascades cleanup through everything it owns. Effects, by contrast, are not really "things" in the same way. Their function bodies run, set up some behavior, register teardown, and return. The next run is a fresh execution. What persists between runs isn't the effect's function but the scope it belongs to.

This reframes a lot of decisions. The question "where should this reactive behavior live?" becomes "what scope owns it, and is that the right scope for its lifetime?" The question "how do I clean this up?" mostly answers itself once the scope is right — cleanup cascades from disposal. Grouping behaviors that share a fate under one scope isn't just tidier; it's what makes the ownership model do its job.

**Reactive modules.** Components are the familiar shape of a reactive scope, but the same pattern generalizes beyond the view layer. A class or factory function whose constructor calls `$effect`, accepts getters as props, and exposes state and methods is effectively a component without a template — a reactive module. When instantiated inside an ambient reactive scope, its effects are owned by that scope and cleaned up when it disposes. This is the natural shape for stores, controllers, view models, and resource managers: anything that bundles state, behavior, and reactive lifecycle but isn't UI.

Props to such a module should be passed as getters (`() => signal`), not unwrapped values, so reactivity crosses the boundary instead of being snapshotted at construction. The instance's identity and the enclosing scope's identity become linked — the module lives as long as the scope does, and its internal machinery is torn down with it.

Reach for this pattern when state, methods, and effects genuinely belong together as a unit. If a class has no real state or methods and exists only to hold some effects, a plain function inside an effect is usually cleaner. The test: if the effects were removed, would the rest still want to be a class?

**Some further implications worth making concrete:**

- If an effect sets up a subscription, listener, timer, or external resource, it should return a cleanup. This is how teardown gets registered with the scope; without it, disposal has nothing to cascade.
- `$derived` is the right tool for computing values from reactive state; `$effect` is for side effects on the world outside the reactive graph. An effect that exists to assign to a `$state` is almost always a derivation in disguise.
- Reactive logic that needs to outlive a component belongs in an `$effect.root`, and whoever creates the root owns the disposer.
- When designing a feature, "what is the scope here?" is usually a more productive starting question than "what effects do I need?"

The goal is code where scope boundaries and ownership are obvious, where reactive behavior is encapsulated into modules that attach cleanly to their enclosing scope, and where individual effects are small attachments rather than self-contained units trying to manage their own lifecycles.