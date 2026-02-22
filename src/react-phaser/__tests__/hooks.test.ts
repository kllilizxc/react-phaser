import { describe, expect, it, vi } from "vitest";
import { createMockScene } from "./test-utils";
import { mountRoot } from "../core";
import { onMount, useCallback, useEffect, useEvent, useLayoutEffect, useMemo, useState, useUpdate } from "../hooks";

describe("react-phaser hooks", () => {
    it("useState schedules a re-render on change", async () => {
        const scene = createMockScene();
        let renders = 0;
        let setCount: (val: number) => void = () => {
            throw new Error("setCount not set");
        };

        function App() {
            const [count, set] = useState(0);
            renders++;
            setCount = set;
            return count ? null : null;
        }

        mountRoot(scene as any, App, {});
        expect(renders).toBe(1);

        setCount(1);
        await Promise.resolve();
        expect(renders).toBe(2);

        // No-op update should not re-render
        setCount(1);
        await Promise.resolve();
        expect(renders).toBe(2);
    });

    it("useState supports lazy initializers and functional updates", async () => {
        const scene = createMockScene();
        let renders = 0;
        let inits = 0;
        let setCount: ((val: number | ((prev: number) => number)) => void) | null = null;

        function App() {
            const [count, set] = useState(() => {
                inits++;
                return 1;
            });
            renders++;
            setCount = set;
            return count ? null : null;
        }

        mountRoot(scene as any, App, {});
        expect(inits).toBe(1);
        expect(renders).toBe(1);

        setCount!((prev) => prev + 1);
        await Promise.resolve();

        expect(inits).toBe(1);
        expect(renders).toBe(2);
    });

    it("useState setter is a no-op after unmount", async () => {
        const scene = createMockScene();
        let renders = 0;
        let setCount: ((val: number) => void) | null = null;

        function App() {
            const [_count, set] = useState(0);
            renders++;
            setCount = set;
            return null;
        }

        const root = mountRoot(scene as any, App, {});
        expect(renders).toBe(1);

        root.unmount();
        setCount!(1);
        await Promise.resolve();
        expect(renders).toBe(1);
    });

    it("useMemo caches by deps", () => {
        const scene = createMockScene();
        let computes = 0;

        function App(props: { n: number }) {
            useMemo(() => {
                computes++;
                return props.n * 2;
            }, [props.n]);
            return null;
        }

        const root = mountRoot(scene as any, App, { n: 1 });
        expect(computes).toBe(1);

        root.update({ n: 1 });
        expect(computes).toBe(1);

        root.update({ n: 2 });
        expect(computes).toBe(2);
    });

    it("useCallback returns stable identity when deps unchanged", () => {
        const scene = createMockScene();
        let last: Function | null = null;
        let initial: Function | null = null;

        function App(props: { n: number }) {
            const cb = useCallback(() => props.n, [props.n]);
            last = cb;
            if (!initial) initial = cb;
            return null;
        }

        const root = mountRoot(scene as any, App, { n: 1 });
        expect(last).toBe(initial);
        root.update({ n: 1 });
        expect(last).toBe(initial);
        root.update({ n: 2 });
        expect(last).not.toBe(initial);
    });

    it("useEvent keeps stable identity but calls latest handler", () => {
        const scene = createMockScene();
        const calls: number[] = [];
        let stable: () => void = () => {
            throw new Error("stable handler not set");
        };
        let captured = false;

        function App(props: { n: number }) {
            const fn = useEvent(() => calls.push(props.n));
            if (!captured) {
                stable = fn;
                captured = true;
            }
            return null;
        }

        const root = mountRoot(scene as any, App, { n: 1 });
        stable();
        root.update({ n: 2 });
        expect(stable).toBeTruthy();
        stable();
        expect(calls).toEqual([1, 2]);
    });

    it("useEvent stable handler becomes a no-op after unmount", () => {
        const scene = createMockScene();
        const calls: number[] = [];
        let stable: () => void = () => {
            throw new Error("stable handler not set");
        };

        function App(props: { n: number }) {
            stable = useEvent(() => calls.push(props.n));
            return null;
        }

        const root = mountRoot(scene as any, App, { n: 1 });
        stable();
        expect(calls).toEqual([1]);

        root.unmount();
        stable();
        expect(calls).toEqual([1]);
    });

    it("useLayoutEffect runs before useEffect and both clean up on deps change", () => {
        const scene = createMockScene();
        const calls: string[] = [];

        function App(props: { n: number }) {
            useLayoutEffect(() => {
                calls.push(`layout:${props.n}`);
                return () => calls.push(`layout:cleanup:${props.n}`);
            }, [props.n]);

            useEffect(() => {
                calls.push(`effect:${props.n}`);
                return () => calls.push(`effect:cleanup:${props.n}`);
            }, [props.n]);

            return null;
        }

        const root = mountRoot(scene as any, App, { n: 1 });
        expect(calls).toEqual(["layout:1", "effect:1"]);

        root.update({ n: 2 });
        expect(calls).toEqual([
            "layout:1",
            "effect:1",
            "layout:cleanup:1",
            "layout:2",
            "effect:cleanup:1",
            "effect:2",
        ]);
    });

    it("useUpdate subscribes to scene updates and unsubscribes on unmount", () => {
        const scene = createMockScene();
        let updates = 0;

        function App() {
            useUpdate(() => { updates++; });
            return null;
        }

        const root = mountRoot(scene as any, App, {});
        scene.events.emit("update", 100, 16);
        expect(updates).toBe(1);

        root.unmount();
        scene.events.emit("update", 200, 16);
        expect(updates).toBe(1);
    });

    it("useUpdate uses the latest callback after re-render", () => {
        const scene = createMockScene();
        const calls: number[] = [];

        function App(props: { n: number }) {
            useUpdate(() => calls.push(props.n));
            return null;
        }

        const root = mountRoot(scene as any, App, { n: 1 });
        scene.events.emit("update", 0, 16);

        root.update({ n: 2 });
        scene.events.emit("update", 0, 16);

        expect(calls).toEqual([1, 2]);
        root.unmount();
    });

    it("onMount does not register cleanup when the callback returns void", () => {
        const scene = createMockScene();
        const calls = vi.fn();

        function AppTest() {
            onMount(() => {
                calls();
                return undefined;
            });
            return null;
        }

        const root = mountRoot(scene as any, AppTest, {});
        expect(calls).toHaveBeenCalledTimes(1);
        root.unmount();
        expect(calls).toHaveBeenCalledTimes(1);
    });

    it("useEffect does not rerun when deps are unchanged", () => {
        const scene = createMockScene();
        const calls: string[] = [];
        const cleanup = vi.fn();

        function App(props: { n: number }) {
            useEffect(() => {
                calls.push(`effect:${props.n}`);
                return cleanup;
            }, [props.n]);
            return null;
        }

        const root = mountRoot(scene as any, App, { n: 1 });
        expect(calls).toEqual(["effect:1"]);

        root.update({ n: 1 });
        expect(calls).toEqual(["effect:1"]);

        root.unmount();
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("useEffect ignores non-function cleanup returns", () => {
        const scene = createMockScene();
        const calls: string[] = [];

        function App() {
            useEffect(() => {
                calls.push("effect");
                return 123 as any;
            }, []);
            return null;
        }

        const root = mountRoot(scene as any, App, {});
        expect(calls).toEqual(["effect"]);
        expect(() => root.unmount()).not.toThrow();
    });

    it("useUpdate wrapper early-returns when called after unmount", () => {
        const scene = createMockScene();
        let updates = 0;
        let captured: ((time: number, delta: number) => void) | null = null;

        const originalOn = scene.events.on.bind(scene.events);
        scene.events.on = (event: string, fn: (...args: any[]) => void) => {
            if (event === "update") captured = fn as any;
            return originalOn(event, fn);
        };

        function App() {
            useUpdate(() => { updates++; });
            return null;
        }

        const root = mountRoot(scene as any, App, {});
        expect(captured).toBeTruthy();

        root.unmount();
        captured!(0, 16);
        expect(updates).toBe(0);
    });
});
