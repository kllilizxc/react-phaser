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

    it("supports mounting and updating a root VNode", () => {
        const scene = createMockScene();

        const spriteRef = { current: null as Phaser.GameObjects.Sprite | null };

        function App(props: { x: number }) {
            return createNode("sprite", { ref: spriteRef, texture: "t", x: props.x });
        }

        const root = mountRoot(scene as any, createNode(App, { x: 1 }));
        expect(spriteRef.current?.x).toBe(1);

        root.update(createNode(App, { x: 2 }));
        expect(spriteRef.current?.x).toBe(2);

        root.update(null);
        expect(spriteRef.current).toBeNull();

        root.unmount();
    });
});
