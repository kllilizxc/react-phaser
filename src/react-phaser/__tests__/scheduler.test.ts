import { describe, expect, it, vi } from "vitest";

describe("react-phaser scheduler", () => {
    it("batches multiple scheduleRender calls for the same instance", async () => {
        const { scheduleRender } = await import("../scheduler");
        let renders = 0;
        const inst = { unmounted: false, render: () => { renders++; } };

        scheduleRender(inst);
        scheduleRender(inst);

        await Promise.resolve();
        expect(renders).toBe(1);
    });

    it("does nothing if scheduled instance is already unmounted", async () => {
        const { scheduleRender } = await import("../scheduler");
        let renders = 0;
        const inst = { unmounted: true, render: () => { renders++; } };

        scheduleRender(inst);
        await Promise.resolve();
        expect(renders).toBe(0);
    });

    it("skips render if instance unmounts before flush", async () => {
        const { scheduleRender } = await import("../scheduler");
        let renders = 0;
        const inst = { unmounted: false, render: () => { renders++; } };

        scheduleRender(inst);
        inst.unmounted = true;

        await Promise.resolve();
        expect(renders).toBe(0);
    });

    it("falls back to Promise microtasks when queueMicrotask is missing", async () => {
        const original = globalThis.queueMicrotask;
        try {
            // @ts-expect-error - intentionally override for test
            globalThis.queueMicrotask = undefined;
            vi.resetModules();

            const { scheduleRender } = await import("../scheduler");
            let renders = 0;
            const inst = { unmounted: false, render: () => { renders++; } };

            scheduleRender(inst);
            await Promise.resolve();
            expect(renders).toBe(1);
        } finally {
            globalThis.queueMicrotask = original;
        }
    });
});
