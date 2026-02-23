import Phaser from "phaser";

type ArcadeSprite = Phaser.Physics.Arcade.Sprite;

function syncBody(sprite: ArcadeSprite) {
    const body = (sprite as any).body;
    if (body && typeof body.updateFromGameObject === "function") {
        body.updateFromGameObject();
    }
}

export function ensureArcadeBodySyncPatched(sprite: ArcadeSprite) {
    const s = sprite as any;
    if (s.__v_arcadeBodySyncPatched) return;
    s.__v_arcadeBodySyncPatched = true;

    const patchMethod = (methodName: "setPosition" | "setX" | "setY") => {
        const original = (sprite as any)[methodName];
        if (typeof original !== "function") return;

        (sprite as any)[methodName] = function patchedMethod(...args: any[]) {
            const result = original.apply(this, args);
            syncBody(this as ArcadeSprite);
            return result;
        };
    };

    patchMethod("setPosition");
    patchMethod("setX");
    patchMethod("setY");
}

