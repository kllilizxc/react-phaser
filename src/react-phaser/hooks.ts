import type Phaser from "phaser";
import { devWarnOnce } from "./dev";
import { scheduleRender } from "./scheduler";
import { consumeHookIndex, requireCurrentContext } from "./hook-runtime";

export function useState<T>(initialValue: T | (() => T)): [T, (val: T | ((prev: T) => T)) => void] {
    const ctx = requireCurrentContext("useState");
    const index = consumeHookIndex();

    if (!ctx.hooks[index]) {
        const value = typeof initialValue === "function" ? (initialValue as Function)() : initialValue;
        ctx.hooks[index] = { state: value };
    }

    const state = ctx.hooks[index].state;

    const setState = (newVal: T | ((prev: T) => T)) => {
        if (ctx.unmounted) return;
        const nextState = typeof newVal === "function" ? (newVal as Function)(ctx.hooks[index].state) : newVal;
        if (nextState !== ctx.hooks[index].state) {
            ctx.hooks[index].state = nextState;
            scheduleRender(ctx);
        }
    };

    return [state, setState];
}

export function useStore<T, U = T>(storeHook: () => T, selector?: (store: T) => U): U {
    const ctx = requireCurrentContext("useStore");
    const index = consumeHookIndex();

    const store = storeHook() as any;

    const isDeepValue = (value: any) => value !== null && (typeof value === "object" || typeof value === "function");
    const pathsIntersect = (a: string, b: string) => {
        if (a === "" || b === "") return true;
        if (a === b) return true;
        if (a.startsWith(`${b}.`)) return true;
        if (b.startsWith(`${a}.`)) return true;
        return false;
    };

    const select = (nextStore: any, nextSelector?: ((s: any) => any)) => {
        if (!nextSelector) return { value: nextStore, deps: null as string[] | null };
        if (typeof nextStore?.$track === "function") {
            try {
                const res = nextStore.$track((s: any) => nextSelector(s));
                if (res && typeof res === "object" && Array.isArray(res.deps)) {
                    return { value: res.value, deps: res.deps as string[] };
                }
            } catch {
                // Fall through.
            }
        }
        return { value: nextSelector(nextStore), deps: null as string[] | null };
    };

    const refreshSubscription = () => {
        const hook = ctx.hooks[index];
        if (!hook) return;

        const hookState = hook.state;
        const nextStore = hookState.store;

        if (hookState.subscribedStore === nextStore) return;

        if (hook.cleanup) {
            hook.cleanup();
            hook.cleanup = undefined;
        }

        hookState.subscribedStore = nextStore;

        if (!nextStore?.$subscribe) {
            devWarnOnce(
                "react-phaser:useStore:missing-subscribe",
                "react-phaser: useStore(...) received a store without $subscribe(); it will not re-render on updates."
            );
            return;
        }

        const unsubscribe = nextStore.$subscribe((mutation: any) => {
            if (ctx.unmounted) return;

            const latestHook = ctx.hooks[index];
            if (!latestHook) return;

            const latestState = latestHook.state;

            // Ignore mutations from an old store instance if the hook switched stores.
            if (latestState.store !== nextStore) return;

            const latestSelector = latestState.selector;
            const deps = latestState.deps;

            if (latestSelector) {
                const changedKeys: string[] | null =
                    mutation && Array.isArray(mutation.changes)
                        ? mutation.changes.map((c: any) => c?.key).filter((k: any) => typeof k === "string")
                        : null;

                if (Array.isArray(deps) && changedKeys) {
                    const matches = deps.length === 0 || changedKeys.some((k) => deps.some((d) => pathsIntersect(d, k)));
                    if (!matches) return;
                }

                const next = select(nextStore, latestSelector as any);
                latestState.deps = next.deps;

                if (next.value !== latestState.value || isDeepValue(next.value)) {
                    latestState.value = next.value;
                    scheduleRender(ctx);
                }
                return;
            }

            scheduleRender(ctx);
        });

        hook.cleanup = () => unsubscribe();

        // Catch up in case the store changed between render and subscribing
        const next = select(nextStore, hookState.selector as any);
        hookState.deps = next.deps;
        if (next.value !== hookState.value) {
            hookState.value = next.value;
            scheduleRender(ctx);
        }
    };

    if (!ctx.hooks[index]) {
        const selected = select(store, selector as any);
        const state = { value: selected.value as any, store, selector, deps: selected.deps, subscribedStore: null as any };
        ctx.hooks[index] = { state };
    }

    // Keep selector/store references fresh and return a render-time snapshot
    const hookState = ctx.hooks[index].state;
    hookState.store = store;
    hookState.selector = selector;
    const next = select(store, selector as any);
    hookState.deps = next.deps;
    hookState.value = next.value;

    // Subscribe after commit (avoid side effects during render) and refresh when the store instance changes.
    if (hookState.subscribedStore !== store) {
        ctx.addLayoutEffect(refreshSubscription);
    }
    return hookState.value;
}

export function useScene(): Phaser.Scene {
    const ctx = requireCurrentContext("useScene");
    return ctx.scene;
}

export function useRef<T>(initialValue: T): { current: T };
export function useRef<T>(initialValue: T | null): { current: T | null };
export function useRef<T>(initialValue: T | null): { current: T | null } {
    const ctx = requireCurrentContext("useRef");
    const index = consumeHookIndex();

    if (!ctx.hooks[index]) {
        ctx.hooks[index] = { state: { current: initialValue } };
    }

    return ctx.hooks[index].state;
}

export function useMemo<T>(factory: () => T, deps?: any[]): T {
    const ctx = requireCurrentContext("useMemo");
    const index = consumeHookIndex();

    const oldDeps = ctx.hooks[index]?.deps;
    const hasChanged = !deps || !oldDeps || deps.length !== oldDeps.length || deps.some((d, i) => d !== oldDeps[i]);

    if (!ctx.hooks[index] || hasChanged) {
        const value = factory();
        ctx.hooks[index] = { state: value, deps };
    }

    return ctx.hooks[index].state;
}

export function useCallback<T extends Function>(callback: T, deps?: any[]): T {
    return useMemo(() => callback, deps);
}

export function useEvent<T extends (...args: any[]) => any>(handler: T): T {
    const ctx = requireCurrentContext("useEvent");
    const index = consumeHookIndex();

    if (!ctx.hooks[index]) {
        const state = {
            handler,
            stable: ((...args: any[]) => {
                if (ctx.unmounted) return;
                return state.handler(...args);
            }) as T,
        };

        ctx.hooks[index] = { state };
        return state.stable;
    }

    ctx.hooks[index].state.handler = handler;
    return ctx.hooks[index].state.stable;
}

export function useUpdate(callback: (time: number, delta: number) => void): void {
    const ctx = requireCurrentContext("useUpdate");
    const index = consumeHookIndex();

    if (!ctx.hooks[index]) {
        // Store the callback in state
        const state = { callback };
        ctx.hooks[index] = { state };

        // Register after commit (avoid side effects during render)
        ctx.addLayoutEffect(() => {
            const updateWrapper = (time: number, delta: number) => {
                if (ctx.unmounted) return;
                state.callback(time, delta);
            };

            ctx.scene.events.on("update", updateWrapper);
            ctx.hooks[index].cleanup = () => {
                ctx.scene.events.off("update", updateWrapper);
            };
        });
    } else {
        // Update fresh references
        ctx.hooks[index].state.callback = callback;
    }
}

export function onMount(callback: () => void | (() => void)) {
    const ctx = requireCurrentContext("onMount");
    const index = consumeHookIndex();

    if (!ctx.hooks[index]) {
        ctx.hooks[index] = { state: true };
        ctx.addLayoutEffect(() => {
            const cleanup = callback();
            if (typeof cleanup === "function") {
                ctx.hooks[index].cleanup = cleanup;
            }
        });
    }
}

export function useLayoutEffect(callback: () => void | (() => void), deps?: any[]) {
    const ctx = requireCurrentContext("useLayoutEffect");
    const index = consumeHookIndex();

    const oldDeps = ctx.hooks[index]?.deps;
    const hasChanged = !deps || !oldDeps || deps.length !== oldDeps.length || deps.some((d, i) => d !== oldDeps[i]);

    if (hasChanged) {
        if (!ctx.hooks[index]) {
            ctx.hooks[index] = {};
        }
        ctx.hooks[index].deps = deps;

        ctx.addLayoutEffect(() => {
            if (ctx.hooks[index].cleanup) {
                ctx.hooks[index].cleanup();
            }
            const cleanup = callback();
            if (typeof cleanup === "function") {
                ctx.hooks[index].cleanup = cleanup;
            }
        });
    }
}

export function useEffect(callback: () => void | (() => void), deps?: any[]) {
    const ctx = requireCurrentContext("useEffect");
    const index = consumeHookIndex();

    const oldDeps = ctx.hooks[index]?.deps;
    const hasChanged = !deps || !oldDeps || deps.length !== oldDeps.length || deps.some((d, i) => d !== oldDeps[i]);

    if (hasChanged) {
        if (!ctx.hooks[index]) {
            ctx.hooks[index] = {};
        }
        ctx.hooks[index].deps = deps;

        ctx.addEffect(() => {
            // Run cleanup of previous effect
            if (ctx.hooks[index].cleanup) {
                ctx.hooks[index].cleanup();
            }
            const cleanup = callback();
            if (typeof cleanup === "function") {
                ctx.hooks[index].cleanup = cleanup;
            }
        });
    }
}
