import { describe, expect, it, vi } from "vitest";
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

    it("tracks deep mutations inside actions", () => {
        const useStore = defineGameStore("test_deep_mutations", {
            state: () => ({ player: { hp: 10 } }),
            actions: {
                hit() {
                    this.player.hp -= 1;
                },
            },
        });

        const store = useStore() as any;
        const mutations: Mutation[] = [];
        store.$subscribe((m: Mutation) => mutations.push(m));

        store.hit();

        expect(store.player.hp).toBe(9);
        expect(mutations).toHaveLength(1);
        expect(mutations[0].action).toBe("hit");
        expect(mutations[0].changes).toEqual([{ key: "player.hp", old: 10, new: 9 }]);
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
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
        (store.$state as any).extra = 123;
        expect(warn).toHaveBeenCalled();
        expect(Object.keys(store.$state)).toEqual(["a", "b", "extra"]);

        store.$reset();
        expect(store.a).toBe(1);
        expect(store.b).toBe(2);
        expect(Object.keys(store.$state)).toEqual(["a", "b"]);
        warn.mockRestore();
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

    it("$watch calls back when a selected primitive changes", () => {
        const useStore = defineGameStore("test_watch_primitives", {
            state: () => ({ n: 0, other: 0 }),
            actions: {
                inc() {
                    this.n++;
                },
                incOther() {
                    this.other++;
                },
            },
        });

        const store = useStore() as any;
        const cb = vi.fn();
        const unsub = store.$watch((s: any) => s.n, cb);

        store.inc();
        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledWith(1, 0, expect.objectContaining({ action: "inc" }));

        store.incOther();
        expect(cb).toHaveBeenCalledTimes(1);

        unsub();
        store.inc();
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it("$watch triggers for deep selector values by default", () => {
        const useStore = defineGameStore("test_watch_deep_default", {
            state: () => ({ player: { hp: 10 }, other: 0 }),
            actions: {
                hit() {
                    this.player.hp -= 1;
                },
                incOther() {
                    this.other += 1;
                },
            },
        });

        const store = useStore() as any;
        const cb = vi.fn();
        store.$watch((s: any) => s.player, cb);

        store.hit();
        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), expect.objectContaining({ action: "hit" }));

        store.incOther();
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it("$watch deep=false only triggers on reference changes", () => {
        const useStore = defineGameStore("test_watch_deep_false", {
            state: () => ({ player: { hp: 10 } }),
            actions: {
                hit() {
                    this.player.hp -= 1;
                },
                replace() {
                    this.player = { hp: this.player.hp };
                },
            },
        });

        const store = useStore() as any;
        const cb = vi.fn();
        store.$watch((s: any) => s.player, cb, { deep: false });

        store.hit();
        expect(cb).toHaveBeenCalledTimes(0);

        store.replace();
        expect(cb).toHaveBeenCalledTimes(1);
    });
});
