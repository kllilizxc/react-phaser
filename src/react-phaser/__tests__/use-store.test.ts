import { describe, expect, it, vi } from "vitest";
import { createMockScene } from "./test-utils";
import { mountRoot } from "../core";
import { onMount, useLayoutEffect, useRef, useScene, useStore } from "../hooks";

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
