import { describe, expect, it, vi } from "vitest";

describe("game-state global", () => {
    it("attaches GameState to window when window is defined", async () => {
        const oldWindow = (globalThis as any).window;
        try {
            (globalThis as any).window = {};
            vi.resetModules();

            const { GameState } = await import("../manager");
            await import("../global");

            expect((globalThis as any).window.GameState).toBe(GameState);
        } finally {
            (globalThis as any).window = oldWindow;
        }
    });
});

