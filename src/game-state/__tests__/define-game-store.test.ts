import { describe, expect, it } from "vitest";
import { defineGameStore } from "../define-game-store";
import type { Mutation } from "../types";

describe("game-state defineGameStore", () => {
    it("works with no actions", () => {
        const useStore = defineGameStore("test_no_actions", {
            state: () => ({ n: 1 }),
        });

        const store = useStore() as any;
        expect(store.n).toBe(1);
    });

    it("supports async actions and notifies once after completion", async () => {
        const useStore = defineGameStore("test_async_actions", {
            state: () => ({ n: 0 }),
            actions: {
                async incLater() {
                    this.n++;
                    await Promise.resolve();
                    this.n++;
                },
            },
        });

        const store = useStore() as any;
        const mutations: Mutation[] = [];
        store.$subscribe((m: Mutation) => mutations.push(m));

        await store.incLater();

        expect(store.n).toBe(2);
        expect(mutations).toHaveLength(1);
        expect(mutations[0].action).toBe("incLater");
        expect(mutations[0].changes).toEqual([{ key: "n", old: 0, new: 2 }]);
    });

    it("batches nested action calls into the outermost action", () => {
        const useStore = defineGameStore("test_nested_actions", {
            state: () => ({ n: 0 }),
            actions: {
                inc() {
                    this.n += 1;
                },
                outer() {
                    this.n += 1;
                    this.inc();
                },
            },
        });

        const store = useStore() as any;
        const mutations: Mutation[] = [];
        store.$subscribe((m: Mutation) => mutations.push(m));

        store.outer();

        expect(store.n).toBe(2);
        expect(mutations).toHaveLength(1);
        expect(mutations[0].action).toBe("outer");
        expect(mutations[0].changes).toEqual([{ key: "n", old: 0, new: 2 }]);
    });

    it("defines getters that derive from state", () => {
        const useStore = defineGameStore("test_getters", {
            state: () => ({ n: 2 }),
            getters: {
                double: (state) => state.n * 2,
            },
            actions: {
                inc() {
                    this.n++;
                },
            },
        });

        const store = useStore() as any;
        expect(store.double).toBe(4);
        store.inc();
        expect(store.double).toBe(6);
    });

    it("flushes mutation and rethrows when an action throws", () => {
        const useStore = defineGameStore("test_throwing_action", {
            state: () => ({ n: 0 }),
            actions: {
                boom() {
                    this.n = 1;
                    throw new Error("boom");
                },
            },
        });

        const store = useStore() as any;
        const mutations: Mutation[] = [];
        store.$subscribe((m: Mutation) => mutations.push(m));

        expect(() => store.boom()).toThrow("boom");
        expect(store.n).toBe(1);
        expect(mutations).toHaveLength(1);
        expect(mutations[0].action).toBe("boom");
        expect(mutations[0].changes).toEqual([{ key: "n", old: 0, new: 1 }]);
    });

    it("unsubscribe stops receiving mutations", () => {
        const useStore = defineGameStore("test_unsubscribe", {
            state: () => ({ n: 0 }),
            actions: {
                inc() {
                    this.n++;
                },
            },
        });

        const store = useStore() as any;
        const mutations: Mutation[] = [];
        const unsubscribe = store.$subscribe((m: Mutation) => mutations.push(m));

        store.inc();
        unsubscribe();
        store.inc();

        expect(mutations).toHaveLength(1);
    });

    it("$reset restores state and removes keys not in the next state", () => {
        const useStore = defineGameStore("test_reset", {
            state: () => ({ a: 1, b: 2 }),
            actions: {
                setA(val: number) {
                    this.a = val;
                },
            },
        });

        const store = useStore() as any;
        store.setA(10);
        (store.$state as any).extra = 123;
        expect(Object.keys(store.$state)).toEqual(["a", "b", "extra"]);

        store.$reset();
        expect(store.a).toBe(1);
        expect(store.b).toBe(2);
        expect(Object.keys(store.$state)).toEqual(["a", "b"]);
    });

    it("unsubscribe can be called multiple times", () => {
        const useStore = defineGameStore("test_unsubscribe_idempotent", {
            state: () => ({ n: 0 }),
            actions: {
                inc() {
                    this.n++;
                },
            },
        });

        const store = useStore() as any;
        const mutations: Mutation[] = [];
        const unsubscribe = store.$subscribe((m: Mutation) => mutations.push(m));

        expect(() => {
            unsubscribe();
            unsubscribe();
        }).not.toThrow();

        store.inc();
        expect(mutations).toHaveLength(0);
    });

    it("does not emit a mutation if an action makes no state changes", () => {
        const useStore = defineGameStore("test_no_changes", {
            state: () => ({ n: 0 }),
            actions: {
                noop() {
                    this.n = 0;
                },
            },
        });

        const store = useStore() as any;
        const mutations: Mutation[] = [];
        store.$subscribe((m: Mutation) => mutations.push(m));

        store.noop();
        expect(mutations).toHaveLength(0);
    });

    it("supports symbol keys on $state proxy", () => {
        const useStore = defineGameStore("test_symbol_keys", {
            state: () => ({ n: 0 }),
            actions: {},
        });

        const store = useStore() as any;
        const sym = Symbol("sym");
        (store.$state as any)[sym] = 42;
        expect((store.$state as any)[sym]).toBe(42);
    });

    it("treats thenable functions as async actions", async () => {
        const useStore = defineGameStore("test_thenable_function", {
            state: () => ({ n: 0 }),
            actions: {
                incThenable() {
                    this.n++;
                    const thenable = Object.assign(() => { }, {
                        then: (resolve: () => void) => resolve(),
                    });
                    return thenable as any;
                },
            },
        });

        const store = useStore() as any;
        const mutations: Mutation[] = [];
        store.$subscribe((m: Mutation) => mutations.push(m));

        await store.incThenable();

        expect(store.n).toBe(1);
        expect(mutations).toHaveLength(1);
        expect(mutations[0].action).toBe("incThenable");
        expect(mutations[0].changes).toEqual([{ key: "n", old: 0, new: 1 }]);
    });
});
