import { GameState } from "./manager";
import { RAW_STATE } from "./internal";
import type { Actions, GameStore, Getters, State, StoreDescriptor, Mutation, WatchCallback, WatchOptions } from "./types";

export function defineGameStore<
    S extends State,
    G extends Getters<S> = {},
    A extends Actions = {}
>(
    name: string,
    descriptor: StoreDescriptor<S, G, A>
) {
    const initialState = descriptor.state();
    const state: S = { ...initialState };

    type PendingChange = { key: string; old: any; new: any };

    const isPromiseLike = (value: any): value is Promise<unknown> =>
        !!value && (typeof value === "object" || typeof value === "function") && typeof (value as any).then === "function";

    // Track changes during the *current* action batch (supports async actions).
    // Semantics: nested action calls are batched into the outermost action.
    let actionDepth = 0;
    let currentActionName: string | null = null;
    let pendingChanges: PendingChange[] = [];
    let pendingIndexByKey = new Map<string, number>();

    const joinPath = (base: string, key: string) => (base ? `${base}.${key}` : key);

    const proxyByRaw = new WeakMap<object, any>();
    const rawByProxy = new WeakMap<object, object>();
    let activeTrackDeps: Set<string> | null = null;

    const toRaw = (value: any) => {
        if (!value || typeof value !== "object") return value;
        return rawByProxy.get(value as any) ?? value;
    };

    const recordChange = (keyPath: string, oldValue: any, newValue: any) => {
        if (actionDepth <= 0) {
            GameState.handleNonActionMutation(name, keyPath);
            return;
        }

        // Collect and coalesce changes (1 entry per key, per action batch).
        const existingIndex = pendingIndexByKey.get(keyPath);
        if (existingIndex === undefined) {
            pendingIndexByKey.set(keyPath, pendingChanges.length);
            pendingChanges.push({ key: keyPath, old: oldValue, new: newValue });
        } else {
            pendingChanges[existingIndex] = { ...pendingChanges[existingIndex], new: newValue };
        }
    };

    const createProxy = (target: any, path: string): any => {
        if (!target || typeof target !== "object") return target;

        const existing = proxyByRaw.get(target);
        if (existing) return existing;

        const proxy = new Proxy(target, {
            get(t, key, receiver) {
                const value = Reflect.get(t, key, receiver);
                if (typeof key !== "string") return value;
                activeTrackDeps?.add(joinPath(path, key));
                return createProxy(value, joinPath(path, key));
            },
            set(t, key: string | symbol, value) {
                if (typeof key !== "string") {
                    (t as any)[key] = value;
                    return true;
                }

                const rawValue = toRaw(value);
                const oldValue = (t as any)[key];
                if (oldValue === rawValue) return true;

                recordChange(joinPath(path, key), oldValue, rawValue);
                (t as any)[key] = rawValue;
                return true;
            },
            deleteProperty(t, key: string | symbol) {
                if (typeof key !== "string") {
                    return Reflect.deleteProperty(t, key);
                }
                if (!Object.prototype.hasOwnProperty.call(t, key)) return true;

                const oldValue = (t as any)[key];
                recordChange(joinPath(path, key), oldValue, undefined);
                return Reflect.deleteProperty(t, key);
            },
        });

        proxyByRaw.set(target, proxy);
        rawByProxy.set(proxy, target);
        return proxy;
    };

    const stateProxy = createProxy(state, "") as S;

    // Action-level subscribers: fire once per action with a full Mutation
    const actionSubscribers: ((mutation: Mutation) => void)[] = [];

    const isDeepValue = (value: any) => value !== null && (typeof value === "object" || typeof value === "function");
    const pathsIntersect = (a: string, b: string) => {
        if (a === "" || b === "") return true;
        if (a === b) return true;
        if (a.startsWith(`${b}.`)) return true;
        if (b.startsWith(`${a}.`)) return true;
        return false;
    };

    const flushMutationIfReady = () => {
        if (actionDepth !== 0) return;

        const action = currentActionName;
        const changes = pendingChanges;

        currentActionName = null;
        pendingChanges = [];
        pendingIndexByKey = new Map();

        if (!action || changes.length === 0) return;

        const mutation: Mutation = {
            t: Date.now(),
            store: name,
            action,
            changes,
        };

        const emitted = GameState.emitMutation(mutation);
        actionSubscribers.forEach(cb => cb(emitted));
    };

    const runInAction = (actionName: string, fn: () => any) => {
        const isOutermost = actionDepth === 0;
        actionDepth++;
        if (isOutermost) {
            currentActionName = actionName;
            pendingChanges = [];
            pendingIndexByKey = new Map();
        }

        try {
            const result = fn();
            if (!isPromiseLike(result)) {
                actionDepth--;
                flushMutationIfReady();
                return result;
            }

            return Promise.resolve(result).finally(() => {
                actionDepth--;
                flushMutationIfReady();
            });
        } catch (err) {
            actionDepth--;
            flushMutationIfReady();
            throw err;
        }
    };

    const store: any = {
        $state: stateProxy,

        $reset: () => {
            runInAction("$reset", () => {
                const next = descriptor.state();
                for (const key of Object.keys(state)) {
                    if (!Object.prototype.hasOwnProperty.call(next, key)) {
                        delete (stateProxy as any)[key];
                    }
                }
                for (const [key, value] of Object.entries(next)) {
                    (stateProxy as any)[key] = value;
                }
            });
        },

        /**
         * Fires once per action, after it completes, with the full Mutation.
         * Returns an unsubscribe function.
         */
        $subscribe: (cb: (mutation: Mutation) => void): (() => void) => {
            actionSubscribers.push(cb);
            return () => {
                const idx = actionSubscribers.indexOf(cb);
                if (idx !== -1) actionSubscribers.splice(idx, 1);
            };
        },

        /**
         * Watch a selector and call back when it changes.
         * Tracks read dependencies so updates are filtered by key/path.
         */
        $watch: <T>(selector: (s: GameStore<S, G, A>) => T, cb: WatchCallback<T>, options: WatchOptions<T> = {}) => {
            const equals = options.equals ?? Object.is;
            const deep = options.deep;
            const immediate = options.immediate ?? false;

            let tracked = store.$track(selector as any) as { value: T; deps: string[] };
            let prevValue = tracked.value;
            let deps = tracked.deps;

            if (immediate) {
                cb(prevValue, prevValue, { t: Date.now(), store: name, action: "$watch:init", changes: [] });
            }

            return store.$subscribe((mutation: Mutation) => {
                const changedKeys = Array.isArray(mutation?.changes)
                    ? mutation.changes.map(c => c.key).filter((k): k is string => typeof k === "string")
                    : [];

                const matches =
                    deps.length === 0 ||
                    changedKeys.some(k => deps.some(d => pathsIntersect(d, k)));
                if (!matches) return;

                tracked = store.$track(selector as any) as { value: T; deps: string[] };
                const nextValue = tracked.value;
                const nextDeps = tracked.deps;

                const shouldTrigger =
                    !equals(nextValue, prevValue) ||
                    (deep === true || (deep === undefined && isDeepValue(nextValue)));

                const prev = prevValue;
                prevValue = nextValue;
                deps = nextDeps;

                if (shouldTrigger) {
                    cb(nextValue, prev, mutation);
                }
            });
        },

        /**
         * Runs a selector while tracking which state paths were read.
         * Used by react-phaser's useStore to support deep-mutation reactivity.
         */
        $track: (selector: (s: any) => any) => {
            const deps = new Set<string>();
            const prev = activeTrackDeps;
            activeTrackDeps = deps;

            try {
                const value = selector(store);
                if (value === stateProxy) deps.add("");
                return { value, deps: Array.from(deps) };
            } finally {
                activeTrackDeps = prev;
            }
        },
    };

    (store as any)[RAW_STATE] = state;

    // Add getters
    if (descriptor.getters) {
        for (const [key, getter] of Object.entries(descriptor.getters)) {
            Object.defineProperty(store, key, {
                get: () => getter(stateProxy),
                enumerable: true
            });
        }
    }

    // Add state properties directly to store for easy access
    for (const key of Object.keys(initialState)) {
        Object.defineProperty(store, key, {
            get: () => stateProxy[key],
            set: (val) => ((stateProxy as any)[key] = val),
            enumerable: true
        });
    }

    // Add actions with batched subscriber notification and auto-logging
    if (descriptor.actions) {
        for (const [key, action] of Object.entries(descriptor.actions)) {
            store[key] = function (...args: any[]) {
                return runInAction(key, () => action.apply(store, args));
            };
        }
    }

    GameState.register(name, store);
    return () => store as GameStore<S, G, A>;
}
