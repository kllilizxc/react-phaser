import Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";
import { ComponentInstance, mountRoot } from "../core";
import { createNode } from "../create-node";
import { createMockScene } from "./test-utils";

describe("react-phaser reconciler", () => {
    it("sets and clears refs across updates/removals", () => {
        const scene = createMockScene();

        const ref1 = { current: null as Phaser.GameObjects.Sprite | null };
        const ref2 = { current: null as Phaser.GameObjects.Sprite | null };

        function App(props: { show: boolean; useSecondRef: boolean }) {
            if (!props.show) return null;
            return createNode("sprite", { ref: props.useSecondRef ? ref2 : ref1, texture: "t" });
        }

        const root = mountRoot(scene as any, App, { show: true, useSecondRef: false });
        const sprite = ref1.current;
        expect(sprite).toBeTruthy();
        expect(ref2.current).toBeNull();

        root.update({ show: true, useSecondRef: true });
        expect(ref1.current).toBeNull();
        expect(ref2.current).toBe(sprite);

        const destroySpy = vi.spyOn(sprite as any, "destroy");
        root.update({ show: false, useSecondRef: true });
        expect(ref2.current).toBeNull();
        expect(destroySpy).toHaveBeenCalledTimes(1);

        root.unmount();
        expect(destroySpy).toHaveBeenCalledTimes(1);
    });

    it("does not clear refs that no longer point at the removed host object", () => {
        const scene = createMockScene();

        const spriteRef = { current: null as Phaser.GameObjects.Sprite | null };

        function App(props: { show: boolean }) {
            return createNode(
                "container",
                {},
                props.show ? createNode("sprite", { ref: spriteRef, texture: "t" }) : null
            );
        }

        const root = mountRoot(scene as any, App, { show: true });
        const otherSprite = scene.add.sprite(0, 0);
        spriteRef.current = otherSprite;

        root.update({ show: false });
        expect(spriteRef.current).toBe(otherSprite);
        root.unmount();
    });

    it("clears old refs when a node is replaced by a different type", () => {
        const scene = createMockScene();

        const spriteRef = { current: null as Phaser.GameObjects.Sprite | null };
        const imageRef = { current: null as Phaser.GameObjects.Image | null };

        function App(props: { kind: "sprite" | "image" }) {
            if (props.kind === "sprite") {
                return createNode("sprite", { ref: spriteRef, texture: "t" });
            }
            return createNode("image", { ref: imageRef, texture: "t" });
        }

        const root = mountRoot(scene as any, App, { kind: "sprite" });
        const sprite = spriteRef.current as any;
        const destroySpy = vi.spyOn(sprite, "destroy");

        root.update({ kind: "image" });

        expect(spriteRef.current).toBeNull();
        expect(imageRef.current).toBeTruthy();
        expect(destroySpy).toHaveBeenCalledTimes(1);
        root.unmount();
    });

    it("treats 'graphics' and 'rect' as the same node type", () => {
        const scene = createMockScene();
        const graphicsRef = { current: null as Phaser.GameObjects.Graphics | null };

        function App(props: { kind: "graphics" | "rect" }) {
            return createNode(props.kind, { ref: graphicsRef, width: 10, height: 20, fill: 0x123456 });
        }

        const root = mountRoot(scene as any, App, { kind: "graphics" });
        const graphics = graphicsRef.current as any;
        expect(graphics).toBeTruthy();

        const destroySpy = vi.spyOn(graphics, "destroy");
        root.update({ kind: "rect" });

        expect(graphicsRef.current).toBe(graphics);
        expect(destroySpy).not.toHaveBeenCalled();
        root.unmount();
    });

    it("reorders keyed children under a container to match VNode order", () => {
        const scene = createMockScene();
        const containerRef = { current: null as Phaser.GameObjects.Container | null };

        const a = scene.add.sprite(0, 0);
        const b = scene.add.sprite(0, 0);

        function App(props: { order: ("a" | "b")[] }) {
            const children = props.order.map((id) => createNode(id === "a" ? a : b, { key: id }));
            return createNode("container", { ref: containerRef }, ...children);
        }

        const root = mountRoot(scene as any, App, { order: ["a", "b"] });
        const container = containerRef.current!;

        expect(container.getIndex(a)).toBe(0);
        expect(container.getIndex(b)).toBe(1);

        root.update({ order: ["b", "a"] });

        expect(container.getIndex(b)).toBe(0);
        expect(container.getIndex(a)).toBe(1);
        root.unmount();
    });

    it("reorders nested fragment children under a container", () => {
        const scene = createMockScene();
        const containerRef = { current: null as Phaser.GameObjects.Container | null };

        const a = scene.add.sprite(0, 0);
        const b = scene.add.sprite(0, 0);

        function App(props: { order: ("a" | "b")[] }) {
            const fragmentChildren = props.order.map((id) => createNode(id === "a" ? a : b, { key: id }));
            return createNode("container", { ref: containerRef },
                createNode("fragment", {}, ...fragmentChildren)
            );
        }

        const root = mountRoot(scene as any, App, { order: ["a", "b"] });
        const container = containerRef.current!;

        expect(container.getIndex(a)).toBe(0);
        expect(container.getIndex(b)).toBe(1);

        root.update({ order: ["b", "a"] });
        expect(container.getIndex(b)).toBe(0);
        expect(container.getIndex(a)).toBe(1);
        root.unmount();
    });

    it("reorders component-rendered children under a container (skipping null children)", () => {
        const scene = createMockScene();
        const containerRef = { current: null as Phaser.GameObjects.Container | null };

        const aRef = { current: null as Phaser.GameObjects.Sprite | null };
        const bRef = { current: null as Phaser.GameObjects.Sprite | null };

        function SpriteChild(props: { id: "a" | "b" }) {
            const ref = props.id === "a" ? aRef : bRef;
            return createNode("sprite", { ref, texture: "t" });
        }

        function NullChild() {
            return null;
        }

        function App(props: { order: ("a" | "b")[] }) {
            const children = props.order.map((id) => createNode(SpriteChild, { key: id, id }));
            // Ensure reordering logic tolerates component instances with no host output.
            children.splice(1, 0, createNode(NullChild, { key: "nil" }));
            return createNode("container", { ref: containerRef }, ...children);
        }

        const root = mountRoot(scene as any, App, { order: ["a", "b"] });
        const container = containerRef.current!;

        expect(aRef.current).toBeTruthy();
        expect(bRef.current).toBeTruthy();
        expect(container.getIndex(aRef.current!)).toBe(0);
        expect(container.getIndex(bRef.current!)).toBe(1);

        root.update({ order: ["b", "a"] });
        expect(container.getIndex(bRef.current!)).toBe(0);
        expect(container.getIndex(aRef.current!)).toBe(1);

        root.unmount();
    });

    it("ignores groups when reordering container children", () => {
        const scene = createMockScene();
        const containerRef = { current: null as Phaser.GameObjects.Container | null };
        const groupRef = { current: null as Phaser.Physics.Arcade.Group | null };

        const child = scene.add.sprite(0, 0);

        function App() {
            return createNode("container", { ref: containerRef },
                createNode("physics-group", { key: "group", ref: groupRef, config: {} }),
                createNode(child, { key: "child" })
            );
        }

        const root = mountRoot(scene as any, App, {});
        const container = containerRef.current!;
        expect(container.getIndex(child)).toBe(0);
        expect(groupRef.current).toBeTruthy();
        root.unmount();
    });

    it("uses physics-group pooling and killAndHide on removed children", () => {
        const scene = createMockScene();

        const groupRef = { current: null as Phaser.Physics.Arcade.Group | null };
        const aRef = { current: null as Phaser.Physics.Arcade.Sprite | null };
        const bRef = { current: null as Phaser.Physics.Arcade.Sprite | null };

        function App(props: { showB: boolean }) {
            return createNode(
                "physics-group",
                { ref: groupRef, config: {} },
                createNode("physics-sprite", { key: "a", ref: aRef, texture: "t" }),
                props.showB ? createNode("physics-sprite", { key: "b", ref: bRef, texture: "t" }) : null
            );
        }

        const root = mountRoot(scene as any, App, { showB: true });
        const group = groupRef.current as any;

        expect(group).toBeTruthy();
        expect(group.get).toHaveBeenCalledTimes(2);
        expect(group.killAndHide).not.toHaveBeenCalled();

        const spriteB = bRef.current as any;
        expect(spriteB).toBeTruthy();
        const destroySpy = vi.spyOn(spriteB, "destroy");

        root.update({ showB: false });

        expect(bRef.current).toBeNull();
        expect(group.killAndHide).toHaveBeenCalledWith(spriteB);
        expect(destroySpy).not.toHaveBeenCalled();
        expect(spriteB.body.stop).toHaveBeenCalled();
        expect(spriteB.body.setEnable).toHaveBeenCalledWith(false);
        root.unmount();
    });

    it("destroys non-pooled sprites removed from a physics-group (shelling existing children)", () => {
        const scene = createMockScene();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });

        const group = scene.physics.add.group() as any;
        const existingSprite = scene.physics.add.sprite(0, 0, "t") as any;
        existingSprite.__v_props = { key: "a" };
        group.__v_children = [existingSprite];

        const destroySpy = vi.spyOn(existingSprite, "destroy");

        function App(props: { show: boolean }) {
            return createNode(
                group,
                {},
                props.show ? createNode("physics-sprite", { key: "a", texture: "t" }) : null
            );
        }

        const root = mountRoot(scene as any, App, { show: true });
        root.update({ show: false });

        expect(destroySpy).toHaveBeenCalledTimes(1);
        expect(group.killAndHide).not.toHaveBeenCalled();
        root.unmount();
        warn.mockRestore();
    });

    it("destroys fragment subtrees when a fragment child is removed", () => {
        const scene = createMockScene();
        const spriteRef = { current: null as Phaser.GameObjects.Sprite | null };

        function App(props: { show: boolean }) {
            return createNode(
                "container",
                {},
                props.show
                    ? createNode("fragment", {},
                        createNode("sprite", { ref: spriteRef, texture: "t" })
                    )
                    : null
            );
        }

        const root = mountRoot(scene as any, App, { show: true });
        const sprite = spriteRef.current as any;
        const destroySpy = vi.spyOn(sprite, "destroy");

        root.update({ show: false });

        expect(spriteRef.current).toBeNull();
        expect(destroySpy).toHaveBeenCalledTimes(1);
        root.unmount();
    });

    it("unmounts removed component children under containers", () => {
        const scene = createMockScene();
        const spriteRef = { current: null as Phaser.GameObjects.Sprite | null };

        function Child() {
            return createNode("sprite", { ref: spriteRef, texture: "t" });
        }

        function App(props: { show: boolean }) {
            return createNode(
                "container",
                {},
                props.show ? createNode(Child, { key: "child" }) : null
            );
        }

        const root = mountRoot(scene as any, App, { show: true });
        const sprite = spriteRef.current as any;
        const destroySpy = vi.spyOn(sprite, "destroy");

        root.update({ show: false });

        expect(spriteRef.current).toBeNull();
        expect(destroySpy).toHaveBeenCalledTimes(1);
        root.unmount();
    });

    it("destroys removed host children under containers", () => {
        const scene = createMockScene();
        const spriteRef = { current: null as Phaser.GameObjects.Sprite | null };

        function App(props: { show: boolean }) {
            return createNode(
                "container",
                {},
                props.show ? createNode("sprite", { ref: spriteRef, texture: "t" }) : null
            );
        }

        const root = mountRoot(scene as any, App, { show: true });
        const sprite = spriteRef.current as any;
        const destroySpy = vi.spyOn(sprite, "destroy");

        root.update({ show: false });

        expect(spriteRef.current).toBeNull();
        expect(destroySpy).toHaveBeenCalledTimes(1);
        root.unmount();
    });

    it("stores component children as ComponentInstances in __v_children for diffing", () => {
        const scene = createMockScene();
        const containerRef = { current: null as Phaser.GameObjects.Container | null };

        function Child(props: { texture: string }) {
            return createNode("sprite", { texture: props.texture });
        }

        function App(props: { texture: string }) {
            return createNode(
                "container",
                { ref: containerRef },
                createNode(Child, { texture: props.texture })
            );
        }

        const root = mountRoot(scene as any, App, { texture: "t" });
        const container = containerRef.current as any;

        expect(container.__v_children).toHaveLength(1);
        expect(container.__v_children[0]).toBeInstanceOf(ComponentInstance);
        root.unmount();
    });

    it("reuses component instances when component type matches", () => {
        const scene = createMockScene();
        const containerRef = { current: null as Phaser.GameObjects.Container | null };
        const spriteRef = { current: null as Phaser.GameObjects.Sprite | null };

        function Child(props: { x: number }) {
            return createNode("sprite", { ref: spriteRef, texture: "t", x: props.x });
        }

        function App(props: { x: number }) {
            return createNode(
                "container",
                { ref: containerRef },
                createNode(Child, { key: "child", x: props.x })
            );
        }

        const root = mountRoot(scene as any, App, { x: 1 });
        const container = containerRef.current as any;
        const childInstance = container.__v_children[0];
        const sprite = spriteRef.current as any;

        root.update({ x: 2 });

        expect((containerRef.current as any).__v_children[0]).toBe(childInstance);
        expect(spriteRef.current).toBe(sprite);
        expect(sprite.x).toBe(2);
        root.unmount();
    });

    it("replaces component instances when component type changes", () => {
        const scene = createMockScene();
        const containerRef = { current: null as Phaser.GameObjects.Container | null };

        function ChildA() {
            return createNode("sprite", { texture: "t" });
        }

        function ChildB() {
            return createNode("sprite", { texture: "t" });
        }

        function App(props: { which: "a" | "b" }) {
            const child = props.which === "a"
                ? createNode(ChildA, { key: "child" })
                : createNode(ChildB, { key: "child" });

            return createNode("container", { ref: containerRef }, child);
        }

        const root = mountRoot(scene as any, App, { which: "a" });
        const container = containerRef.current as any;
        const instanceA = container.__v_children[0] as ComponentInstance;
        const unmountSpy = vi.spyOn(instanceA, "unmount");

        root.update({ which: "b" });

        const instanceB = (containerRef.current as any).__v_children[0];
        expect(unmountSpy).toHaveBeenCalledTimes(1);
        expect(instanceB).not.toBe(instanceA);
        root.unmount();
    });

    it("shells direct object vnodes when given an existing matching host object", () => {
        const scene = createMockScene();

        const container = scene.add.container(0, 0) as any;
        const sprite = scene.add.sprite(0, 0, "t") as any;
        container.add(sprite);

        sprite.__v_props = { key: "a" };
        container.__v_children = [sprite];

        const destroySpy = vi.spyOn(sprite, "destroy");

        function App() {
            return createNode(
                container,
                {},
                createNode(sprite, { key: "a" })
            );
        }

        const root = mountRoot(scene as any, App, {});
        expect(destroySpy).not.toHaveBeenCalled();
        expect((container as any).__v_children).toHaveLength(1);
        expect((container as any).__v_children[0]).toBe(sprite);
        root.unmount();
    });

    it("unmounts component children inside physics-groups and killAndHide pooled sprites", () => {
        const scene = createMockScene();

        const groupRef = { current: null as Phaser.Physics.Arcade.Group | null };
        const spriteRef = { current: null as Phaser.Physics.Arcade.Sprite | null };

        function Child() {
            return createNode("physics-sprite", { ref: spriteRef, texture: "t" });
        }

        function App(props: { show: boolean }) {
            return createNode(
                "physics-group",
                { ref: groupRef, config: {} },
                props.show ? createNode(Child, { key: "a" }) : null
            );
        }

        const root = mountRoot(scene as any, App, { show: true });
        const group = groupRef.current as any;
        const sprite = spriteRef.current as any;

        const destroySpy = vi.spyOn(sprite, "destroy");
        root.update({ show: false });

        expect(group.killAndHide).toHaveBeenCalledWith(sprite);
        expect(destroySpy).not.toHaveBeenCalled();
        expect(sprite.body.stop).toHaveBeenCalled();
        expect(sprite.body.setEnable).toHaveBeenCalledWith(false);
        root.unmount();
    });

    it("unmounts nested component subtrees inside physics-groups", () => {
        const scene = createMockScene();

        const groupRef = { current: null as Phaser.Physics.Arcade.Group | null };
        const spriteRef = { current: null as Phaser.Physics.Arcade.Sprite | null };

        function Inner() {
            return createNode("physics-sprite", { ref: spriteRef, texture: "t" });
        }

        function Outer() {
            return createNode(Inner, {});
        }

        function App(props: { show: boolean }) {
            return createNode(
                "physics-group",
                { ref: groupRef, config: {} },
                props.show ? createNode(Outer, { key: "a" }) : null
            );
        }

        const root = mountRoot(scene as any, App, { show: true });
        const sprite = spriteRef.current as any;

        root.update({ show: false });

        expect(sprite.body.stop).toHaveBeenCalled();
        expect(sprite.body.setEnable).toHaveBeenCalledWith(false);
        expect(sprite.active).toBe(false);
        expect(sprite.visible).toBe(false);
        root.unmount();
    });

    it("skips saving pooled children when group.get() returns null", () => {
        const scene = createMockScene();

        const group = scene.physics.add.group() as any;
        group.get.mockReturnValueOnce(null);

        function App() {
            return createNode(
                group,
                {},
                createNode("physics-sprite", { key: "a", texture: "t" })
            );
        }

        const root = mountRoot(scene as any, App, {});
        expect(group.get).toHaveBeenCalledTimes(1);
        expect((group as any).__v_children).toEqual([]);
        root.unmount();
    });

    it("cleans up fragment instances found under physics-groups", () => {
        const scene = createMockScene();

        const group = scene.physics.add.group() as any;
        const pooledA = scene.physics.add.sprite(0, 0, "t") as any;
        const pooledB = scene.physics.add.sprite(0, 0, "t") as any;

        pooledA.__v_pooled = true;
        pooledB.__v_pooled = true;
        pooledB.body = undefined;

        group.__v_children = [{
            __v_fragment: true,
            __v_children: [pooledA, pooledB],
        }];

        function App() {
            return createNode(group, {});
        }

        mountRoot(scene as any, App, {});

        expect(pooledA.active).toBe(false);
        expect(pooledA.visible).toBe(false);
        expect(pooledA.body.stop).toHaveBeenCalled();
        expect(pooledA.body.setEnable).toHaveBeenCalledWith(false);

        expect(pooledB.active).toBe(false);
        expect(pooledB.visible).toBe(false);
    });

    it("warns and skips invalid vnode children under physics-groups", () => {
        const scene = createMockScene();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });

        const groupRef = { current: null as Phaser.Physics.Arcade.Group | null };

        function App() {
            return createNode(
                "physics-group",
                { ref: groupRef, config: {} },
                createNode("sprite", { texture: "t" })
            );
        }

        mountRoot(scene as any, App, {});
        expect((groupRef.current as any).get).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it("warns when physics-group children are missing keys (multiple children)", () => {
        const scene = createMockScene();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });

        const groupRef = { current: null as Phaser.Physics.Arcade.Group | null };

        function App() {
            return createNode(
                "physics-group",
                { ref: groupRef, config: {} },
                createNode("physics-sprite", { key: "a", texture: "t" }),
                createNode("physics-sprite", { texture: "t" })
            );
        }

        const root = mountRoot(scene as any, App, {});
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
        root.unmount();
    });

    it("warns when a container mixes keyed and unkeyed children", () => {
        const scene = createMockScene();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });

        function App() {
            return createNode(
                "container",
                {},
                createNode("sprite", { key: "a", texture: "t" }),
                createNode("sprite", { texture: "t" })
            );
        }

        const root = mountRoot(scene as any, App, {});
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
        root.unmount();
    });

    it("cleans up pooled sprites when a physics-group child component returns an invalid vnode", () => {
        const scene = createMockScene();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });

        const groupRef = { current: null as Phaser.Physics.Arcade.Group | null };

        function BadChild() {
            return createNode("sprite", { texture: "t" });
        }

        function App() {
            return createNode(
                "physics-group",
                { ref: groupRef, config: {} },
                createNode(BadChild, { key: "bad" })
            );
        }

        const root = mountRoot(scene as any, App, {});
        const group = groupRef.current as any;

        expect(group.get).toHaveBeenCalledTimes(1);
        expect(group.killAndHide).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
        root.unmount();
    });

    it("falls back to detached pooled cleanup when a pooled slot has no group", () => {
        const scene = createMockScene();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });

        const group = scene.physics.add.group() as any;
        const pooledSprite = scene.physics.add.sprite(0, 0, "t") as any;
        pooledSprite.__v_pooled = true;

        const pooledSlot: any = {
            __v_slot: true,
            kind: "pooled",
            expectedType: "physics-sprite",
            current: pooledSprite,
            __v_props: { key: "bad" },
        };

        group.__v_children = [pooledSlot];

        function BadChild() {
            return createNode("sprite", { texture: "t" });
        }

        function App() {
            return createNode(group, {}, createNode(BadChild, { key: "bad" }));
        }

        const root = mountRoot(scene as any, App, {});

        expect(group.killAndHide).not.toHaveBeenCalled();
        expect(pooledSprite.active).toBe(false);
        expect(pooledSprite.visible).toBe(false);
        expect(pooledSprite.body.stop).toHaveBeenCalled();
        expect(pooledSprite.body.setEnable).toHaveBeenCalledWith(false);

        warn.mockRestore();
        root.unmount();
    });
});
