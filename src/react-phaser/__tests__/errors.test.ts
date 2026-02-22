import { describe, expect, it, vi } from "vitest";
import { DEV, devWarnOnce } from "../dev";
import { useState } from "../hooks";

describe("react-phaser errors/dev", () => {
    it("throws if a hook is called outside a component", () => {
        expect(() => useState(0)).toThrow("useState must be called inside a component");
    });

    it("devWarnOnce logs at most once per key in DEV", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });

        devWarnOnce("test:warn-once:1", "a");
        devWarnOnce("test:warn-once:1", "a");
        devWarnOnce("test:warn-once:2", "b");

        if (DEV) {
            expect(warn).toHaveBeenCalledTimes(2);
        } else {
            expect(warn).not.toHaveBeenCalled();
        }

        warn.mockRestore();
    });

    it("devWarnOnce is a no-op when DEV is false", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
        const old = process.env.REACT_PHASER_DEV;
        try {
            process.env.REACT_PHASER_DEV = "0";
            vi.resetModules();

            const { DEV: DevFlag, devWarnOnce: warnOnce } = await import("../dev");
            expect(DevFlag).toBe(false);

            warnOnce("test:warn-once:disabled", "nope");
            expect(warn).not.toHaveBeenCalled();
        } finally {
            if (old === undefined) {
                delete process.env.REACT_PHASER_DEV;
            } else {
                process.env.REACT_PHASER_DEV = old;
            }
            warn.mockRestore();
        }
    });

    it("REACT_PHASER_DEV=1 forces DEV mode for devWarnOnce", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
        const old = process.env.REACT_PHASER_DEV;
        try {
            process.env.REACT_PHASER_DEV = "1";
            vi.resetModules();

            const { DEV: DevFlag, devWarnOnce: warnOnce } = await import("../dev");
            expect(DevFlag).toBe(true);

            warnOnce("test:warn-once:forced", "forced");
            expect(warn).toHaveBeenCalledTimes(1);
        } finally {
            if (old === undefined) {
                delete process.env.REACT_PHASER_DEV;
            } else {
                process.env.REACT_PHASER_DEV = old;
            }
            warn.mockRestore();
        }
    });
});
