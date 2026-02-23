import Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";
import { ensureArcadeBodySyncPatched } from "../arcade-body-sync";

describe("react-phaser arcade-body-sync", () => {
    it("syncs Arcade bodies after imperative position updates", () => {
        const sprite = new Phaser.Physics.Arcade.Sprite({} as any, 0, 0, undefined as any) as any;
        const updateFromGameObject = vi.fn();
        sprite.body.updateFromGameObject = updateFromGameObject;

        const setPosition = vi.fn(function (x: number, y: number) {
            this.x = x;
            this.y = y;
            return this;
        });
        const setX = vi.fn(function (x: number) {
            this.x = x;
            return this;
        });
        const setY = vi.fn(function (y: number) {
            this.y = y;
            return this;
        });

        sprite.setPosition = setPosition;
        sprite.setX = setX;
        sprite.setY = setY;

        ensureArcadeBodySyncPatched(sprite);

        sprite.setPosition(1, 2);
        expect(setPosition).toHaveBeenCalledWith(1, 2);
        expect(updateFromGameObject).toHaveBeenCalledTimes(1);

        sprite.setX(3);
        expect(setX).toHaveBeenCalledWith(3);
        expect(updateFromGameObject).toHaveBeenCalledTimes(2);

        sprite.setY(4);
        expect(setY).toHaveBeenCalledWith(4);
        expect(updateFromGameObject).toHaveBeenCalledTimes(3);
    });
});

