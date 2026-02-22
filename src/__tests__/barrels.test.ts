import { describe, expect, it } from "vitest";

describe("src/lib barrels", () => {
    it("react-phaser barrel exports expected symbols", async () => {
        const lib = await import("../react-phaser.ts");
        expect(typeof lib.createNode).toBe("function");
        expect(typeof lib.mountRoot).toBe("function");
    });

    it("game-state barrel exports expected symbols", async () => {
        const lib = await import("../game-state.ts");
        expect(typeof lib.defineGameStore).toBe("function");
        expect(lib.GameState).toBeTruthy();
        expect(typeof lib.GameStateManager).toBe("function");
    });
});

