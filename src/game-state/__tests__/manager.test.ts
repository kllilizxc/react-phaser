import { describe, expect, it } from "vitest";
import { GameStateManager } from "../manager";
import type { Mutation } from "../types";

describe("game-state GameStateManager", () => {
    it("registers stores and snapshots current $state", () => {
        const mgr = new GameStateManager();
        mgr.register("a", { $state: { n: 1 } });
        mgr.register("b", { $state: { ok: true } });

        expect(mgr.snapshot()).toEqual({
            a: { n: 1 },
            b: { ok: true },
        });
    });

    it("keeps a bounded mutation log", () => {
        const mgr = new GameStateManager();
        for (let i = 0; i < 1001; i++) {
            const m: Mutation = { t: i, store: "s", action: "a", changes: [{ key: "n", old: i - 1, new: i }] };
            mgr.addLog(m);
        }

        const log = mgr.getLog();
        expect(log).toHaveLength(1000);
        expect(log[0].t).toBe(1);
        expect(log[999].t).toBe(1000);
    });

    it("dump() contains snapshot and log", () => {
        const mgr = new GameStateManager();
        mgr.register("x", { $state: { n: 7 } });

        const m: Mutation = { t: 1, store: "x", action: "set", changes: [{ key: "n", old: 0, new: 7 }] };
        mgr.addLog(m);

        const out = mgr.dump();
        const parsed = JSON.parse(out);
        expect(parsed.snapshot).toEqual({ x: { n: 7 } });
        expect(parsed.log).toEqual([m]);
    });
});

