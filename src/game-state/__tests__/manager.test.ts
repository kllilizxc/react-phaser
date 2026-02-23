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

    it("snapshot() sorts store names for stable output", () => {
        const mgr = new GameStateManager();
        mgr.register("b", { $state: { n: 1 } });
        mgr.register("a", { $state: { n: 2 } });

        expect(Object.keys(mgr.snapshot())).toEqual(["a", "b"]);
    });

    it("snapshot() returns a stable clone", () => {
        const mgr = new GameStateManager();
        const state = { nested: { n: 1 } };
        mgr.register("a", { $state: state });

        const snap = mgr.snapshot();
        state.nested.n = 2;

        expect(snap.a.nested.n).toBe(1);
    });

    it("addLog() clones mutation payloads", () => {
        const mgr = new GameStateManager();
        const m: Mutation = {
            t: 1,
            store: "x",
            action: "set",
            changes: [{ key: "obj", old: { n: 0 }, new: { n: 1 } }],
        };

        mgr.addLog(m);
        (m.changes[0].new as any).n = 999;

        expect((mgr.getLog()[0].changes[0].new as any).n).toBe(1);
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

    it("dump() is safe for circular and bigint values", () => {
        const mgr = new GameStateManager();
        const state: any = { n: 1n };
        state.self = state;
        mgr.register("x", { $state: state });

        const out = mgr.dump();
        const parsed = JSON.parse(out);
        expect(parsed.snapshot.x.n).toBe("1n");
        expect(parsed.snapshot.x.self).toMatch(/^\[Circular:/);
    });

    it("clones uncloneable mutation payloads into stable debug values", () => {
        const mgr = new GameStateManager();
        const fn = () => { };
        mgr.addLog({
            t: 1,
            store: "x",
            action: "set",
            changes: [{ key: "fn", old: null, new: fn }],
        });

        const log = mgr.getLog();
        expect(typeof log[0].changes[0].new).toBe("string");
        expect(String(log[0].changes[0].new)).toMatch(/^\[Function/);
    });

    it("config() can disable logging", () => {
        const mgr = new GameStateManager();
        mgr.config({ loggingEnabled: false });

        const m: Mutation = { t: 1, store: "x", action: "set", changes: [{ key: "n", old: 0, new: 1 }] };
        mgr.addLog(m);
        expect(mgr.getLog()).toEqual([]);
    });

    it("config() trims the log when reducing maxLogSize", () => {
        const mgr = new GameStateManager();

        for (let i = 0; i < 5; i++) {
            const m: Mutation = { t: i, store: "s", action: "a", changes: [{ key: "n", old: i - 1, new: i }] };
            mgr.addLog(m);
        }
        expect(mgr.getLog()).toHaveLength(5);

        mgr.config({ maxLogSize: 3 });
        const log = mgr.getLog();
        expect(log).toHaveLength(3);
        expect(log[0].t).toBe(2);
        expect(log[2].t).toBe(4);
    });
});
