import Phaser from "phaser";
import { describe, expect, it } from "vitest";
import { mountRoot } from "../core";
import { createNode } from "../create-node";
import { createMockScene } from "./test-utils";

describe("react-phaser mountRoot", () => {
    it("disposes on scene shutdown/destroy and ignores updates after disposal", () => {
        const scene = createMockScene();

        const spriteRef = { current: null as Phaser.GameObjects.Sprite | null };
        let renders = 0;

        function App(props: { n: number }) {
            renders++;
            return createNode("sprite", { ref: spriteRef, texture: "t", x: props.n });
        }

        const root = mountRoot(scene as any, App, { n: 1 });
        expect(renders).toBe(1);
        expect(spriteRef.current).toBeTruthy();

        root.update({ n: 2 });
        expect(renders).toBe(2);

        scene.events.emit("shutdown");
        expect(spriteRef.current).toBeNull();

        const renderedAfterDispose = renders;
        root.update({ n: 3 });
        expect(renders).toBe(renderedAfterDispose);

        root.unmount(); // idempotent
        expect(renders).toBe(renderedAfterDispose);

        scene.events.emit("destroy"); // idempotent (may still be registered in the test emitter)
        expect(renders).toBe(renderedAfterDispose);
    });
});

