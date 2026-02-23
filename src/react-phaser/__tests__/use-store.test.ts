import { describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import { createMockScene } from "./test-utils";
import { mountRoot } from "../core";
import { onMount, useLayoutEffect, useRef, useScene, useStore } from "../hooks";
import { defineGameStore } from "../../game-state/define-game-store";

function createSubscribableStore() {
    const subs = new Set<() => void>();
    const store: any = {
        n: 0,
        other: 0,
        $subscribe: (cb: () => void) => {
            subs.add(cb);
            return () => subs.delete(cb);
        },
        emit: () => {
            for (const cb of Array.from(subs)) cb();
        },
        inc: () => {
            store.n++;
            store.emit();
        },
        incOther: () => {
            store.other++;
            store.emit();
        },
    };
    return store;
}

describe("react-phaser useStore/useScene/useRef/onMount", () => {
    it("useStore re-renders when selected value changes (and not when it doesn't)", async () => {
        const scene = createMockScene();
        const store = createSubscribableStore();
        let renders = 0;

        function App() {
            useStore(() => store, s => s.n);
            renders++;
            return null;
        }

        mountRoot(scene as any, App, {});
        expect(renders).toBe(1);

        store.inc();
        await Promise.resolve();
        expect(renders).toBe(2);

        store.incOther();
        await Promise.resolve();
        expect(renders).toBe(2);
    });

    it("useStore does not subscribe when $subscribe is missing", async () => {
        const scene = createMockScene();
        const store: any = { n: 0 };
        let renders = 0;
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });

        function App() {
            useStore(() => store, s => s.n);
            renders++;
            return null;
        }

        mountRoot(scene as any, App, {});
        expect(renders).toBe(1);

        store.n = 1;
        await Promise.resolve();
        expect(renders).toBe(1);
        warn.mockRestore();
    });

    it("useStore without selector re-renders on any subscribe notification", async () => {
        const scene = createMockScene();
        const store = createSubscribableStore();
        let renders = 0;

        function App() {
            useStore(() => store);
            renders++;
            return null;
        }

        mountRoot(scene as any, App, {});
        expect(renders).toBe(1);

        store.incOther();
        await Promise.resolve();
        expect(renders).toBe(2);
    });

    it("useStore catches up if the store changes before subscription is attached", async () => {
        const scene = createMockScene();
        const store = createSubscribableStore();
        let renders = 0;

        function App() {
            // Runs before the useStore subscription layout effect.
            useLayoutEffect(() => {
                store.n = 1;
            }, []);

            useStore(() => store, s => s.n);
            renders++;
            return null;
        }

        mountRoot(scene as any, App, {});
        expect(renders).toBe(1);

        await Promise.resolve();
        expect(renders).toBe(2);
    });

    it("useStore supports deep-mutation reactivity for game-state selectors", async () => {
        const scene = createMockScene();
        const useGs = defineGameStore("test_useStore_deep_mutations", {
            state: () => ({
                player: { hp: 10 },
                score: 0,
            }),
            actions: {
                hit() {
                    this.player.hp -= 1;
                },
                addScore() {
                    this.score += 1;
                },
            },
        });
        const gs = useGs() as any;

        let renders = 0;
        function App() {
            useStore(useGs as any, s => s.player);
            renders++;
            return null;
        }

        mountRoot(scene as any, App, {});
        expect(renders).toBe(1);

        gs.hit();
        await Promise.resolve();
        expect(renders).toBe(2);

        gs.addScore();
        await Promise.resolve();
        expect(renders).toBe(2);
    });

    it("useStore unsubscribes on unmount", () => {
        const scene = createMockScene();
        const store = createSubscribableStore();

        let unsubCalls = 0;
        const originalSubscribe = store.$subscribe;
        store.$subscribe = (cb: () => void) => {
            const unsub = originalSubscribe(cb);
            return () => {
                unsubCalls++;
                unsub();
            };
        };

        function App() {
            useStore(() => store, s => s.n);
            return null;
        }

        const root = mountRoot(scene as any, App, {});
        root.unmount();
        expect(unsubCalls).toBe(1);
    });

    it("useStore resubscribes when the store instance changes", async () => {
        const scene = createMockScene();
        const storeA = createSubscribableStore();
        const storeB = createSubscribableStore();
        storeB.n = 10;

        let renders = 0;
        function App(props: { store: any }) {
            useStore(() => props.store, s => s.n);
            renders++;
            return null;
        }

        const root = mountRoot(scene as any, App, { store: storeA });
        expect(renders).toBe(1);

        storeA.inc();
        await Promise.resolve();
        expect(renders).toBe(2);

        root.update({ store: storeB });
        expect(renders).toBe(3);

        storeA.inc();
        await Promise.resolve();
        expect(renders).toBe(3);

        storeB.inc();
        await Promise.resolve();
        expect(renders).toBe(4);

        root.unmount();
    });

    it("useStore subscription callback is a no-op after unmount", async () => {
        const scene = createMockScene();
        const store = createSubscribableStore();
        let renders = 0;
        let captured: (() => void) | null = null;

        const originalSubscribe = store.$subscribe;
        store.$subscribe = (cb: () => void) => {
            captured = cb;
            return originalSubscribe(cb);
        };

        function App() {
            useStore(() => store, s => s.n);
            renders++;
            return null;
        }

        const root = mountRoot(scene as any, App, {});
        expect(renders).toBe(1);

        root.unmount();
        captured!();
        await Promise.resolve();
        expect(renders).toBe(1);
    });

    it("useScene and useRef work and remain stable", () => {
        const scene = createMockScene();
        let seenScene: any = null;
        let firstRef: any = null;
        let lastRef: any = null;

        function App() {
            seenScene = useScene();
            const r = useRef({ n: 1 });
            if (!firstRef) firstRef = r;
            lastRef = r;
            return null;
        }

        const root = mountRoot(scene as any, App, {});
        expect(seenScene).toBe(scene);
        expect(lastRef).toBe(firstRef);
        root.update({});
        expect(lastRef).toBe(firstRef);
        root.unmount();
    });

    it("useRef accepts null initial values for non-null generic types", () => {
        const scene = createMockScene();
        let current: any = "unset";

        function App() {
            const r = useRef<Phaser.GameObjects.Sprite>(null);
            current = r.current;
            return null;
        }

        mountRoot(scene as any, App, {});
        expect(current).toBeNull();
    });

    it("onMount runs once and cleans up on unmount", () => {
        const scene = createMockScene();
        let mounts = 0;
        const cleanup = vi.fn();

        function App() {
            onMount(() => {
                mounts++;
                return cleanup;
            });
            return null;
        }

        const root = mountRoot(scene as any, App, {});
        expect(mounts).toBe(1);
        root.update({});
        expect(mounts).toBe(1);
        root.unmount();
        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
