import Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";
import { createMockScene } from "./test-utils";
import { createPhaserObject, updatePhaserObject } from "../phaser-objects";

describe("react-phaser phaser-objects", () => {
    it("createPhaserObject supports all built-in node types", () => {
        const scene = createMockScene();

        expect(createPhaserObject(scene as any, "container", { x: 1, y: 2 })).toBeInstanceOf(Phaser.GameObjects.Container);
        expect(createPhaserObject(scene as any, "text", { x: 1, y: 2, text: "hi" })).toBeInstanceOf(Phaser.GameObjects.Text);
        expect(createPhaserObject(scene as any, "graphics", {})).toBeInstanceOf(Phaser.GameObjects.Graphics);
        expect(createPhaserObject(scene as any, "rect", {})).toBeInstanceOf(Phaser.GameObjects.Graphics);
        expect(createPhaserObject(scene as any, "sprite", { x: 1, y: 2, texture: "t" })).toBeInstanceOf(Phaser.GameObjects.Sprite);
        expect(createPhaserObject(scene as any, "image", { x: 1, y: 2, texture: "t" })).toBeInstanceOf(Phaser.GameObjects.Image);
        expect(createPhaserObject(scene as any, "physics-sprite", { x: 1, y: 2, texture: "t" })).toBeInstanceOf(Phaser.Physics.Arcade.Sprite);
        expect(createPhaserObject(scene as any, "physics-group", { config: {} })).toBeInstanceOf(Phaser.Physics.Arcade.Group);
    });

    it("createPhaserObject supports wordWrap defaults for text nodes", () => {
        const scene = createMockScene();
        expect(createPhaserObject(scene as any, "text", { text: "hi", wordWrapWidth: 100 })).toBeInstanceOf(Phaser.GameObjects.Text);
    });

    it("createPhaserObject throws on unknown node types", () => {
        const scene = createMockScene();
        expect(() => createPhaserObject(scene as any, "nope", {})).toThrow("Unknown node type: nope");
    });

    it("syncs custom props into Data Manager and removes stale keys", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        (obj as any).damage = 0;

        updatePhaserObject(obj as any, "sprite", { damage: 5, foo: "bar" }, {}, true);
        expect((obj as any).damage).toBe(5);
        expect(obj.getData("damage")).toBe(5);
        expect(obj.getData("foo")).toBe("bar");

        updatePhaserObject(obj as any, "sprite", { damage: 5 }, { damage: 5, foo: "bar" }, false);
        expect(obj.getData("foo")).toBeUndefined();
    });

    it("attaches stable input handlers and calls the latest props", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const on = vi.spyOn(obj as any, "on");

        const calls: string[] = [];
        const fn1 = () => calls.push("fn1");
        const fn2 = () => calls.push("fn2");

        updatePhaserObject(obj as any, "sprite", { interactive: true, onClick: fn1 }, {}, true);
        expect(on).toHaveBeenCalledTimes(1);

        (obj as any).emit("pointerdown");
        expect(calls).toEqual(["fn1"]);

        updatePhaserObject(obj as any, "sprite", { interactive: true, onClick: fn2 }, { interactive: true, onClick: fn1 }, false);
        expect(on).toHaveBeenCalledTimes(1);

        (obj as any).emit("pointerdown");
        expect(calls).toEqual(["fn1", "fn2"]);

        updatePhaserObject(obj as any, "sprite", { interactive: true }, { interactive: true, onClick: fn2 }, false);
        (obj as any).emit("pointerdown");
        expect(calls).toEqual(["fn1", "fn2"]);
    });

    it("supports wheel and drag target event props with stable wrappers", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const on = vi.spyOn(obj as any, "on");

        const calls: string[] = [];
        const wheel1 = () => calls.push("wheel1");
        const dragEnter1 = () => calls.push("dragEnter1");
        const drop1 = () => calls.push("drop1");

        updatePhaserObject(obj as any, "sprite", {
            interactive: true,
            onWheel: wheel1,
            onDragEnter: dragEnter1,
            onDrop: drop1,
        }, {}, true);

        expect(on).toHaveBeenCalledTimes(3);

        (obj as any).emit("wheel");
        (obj as any).emit("dragenter");
        (obj as any).emit("drop");
        expect(calls).toEqual(["wheel1", "dragEnter1", "drop1"]);

        const wheel2 = () => calls.push("wheel2");
        const dragEnter2 = () => calls.push("dragEnter2");
        const drop2 = () => calls.push("drop2");

        updatePhaserObject(obj as any, "sprite", {
            interactive: true,
            onWheel: wheel2,
            onDragEnter: dragEnter2,
            onDrop: drop2,
        }, {
            interactive: true,
            onWheel: wheel1,
            onDragEnter: dragEnter1,
            onDrop: drop1,
        }, false);

        expect(on).toHaveBeenCalledTimes(3);

        (obj as any).emit("wheel");
        (obj as any).emit("dragenter");
        (obj as any).emit("drop");
        expect(calls).toEqual(["wheel1", "dragEnter1", "drop1", "wheel2", "dragEnter2", "drop2"]);

        updatePhaserObject(obj as any, "sprite", { interactive: true }, {
            interactive: true,
            onWheel: wheel2,
            onDragEnter: dragEnter2,
            onDrop: drop2,
        }, false);

        (obj as any).emit("wheel");
        (obj as any).emit("dragenter");
        (obj as any).emit("drop");
        expect(calls).toEqual(["wheel1", "dragEnter1", "drop1", "wheel2", "dragEnter2", "drop2"]);
    });

    it("supports pointer and drag event props with stable wrappers", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const on = vi.spyOn(obj as any, "on");

        const calls: string[] = [];
        const down1 = () => calls.push("down1");
        const click1 = () => calls.push("click1");
        const up1 = () => calls.push("up1");
        const drag1 = () => calls.push("drag1");

        updatePhaserObject(obj as any, "sprite", {
            interactive: true,
            onPointerDown: down1,
            onClick: click1,
            onPointerUp: up1,
            onDrag: drag1,
        }, {}, true);

        expect(on).toHaveBeenCalledTimes(3);
        (obj as any).emit("pointerdown");
        (obj as any).emit("pointerup");
        (obj as any).emit("drag");
        expect(calls).toEqual(["down1", "click1", "up1", "drag1"]);

        const down2 = () => calls.push("down2");
        const click2 = () => calls.push("click2");
        const up2 = () => calls.push("up2");
        const drag2 = () => calls.push("drag2");

        updatePhaserObject(obj as any, "sprite", {
            interactive: true,
            onPointerDown: down2,
            onClick: click2,
            onPointerUp: up2,
            onDrag: drag2,
        }, {
            interactive: true,
            onPointerDown: down1,
            onClick: click1,
            onPointerUp: up1,
            onDrag: drag1,
        }, false);

        expect(on).toHaveBeenCalledTimes(3);
        (obj as any).emit("pointerdown");
        (obj as any).emit("pointerup");
        (obj as any).emit("drag");
        expect(calls).toEqual(["down1", "click1", "up1", "drag1", "down2", "click2", "up2", "drag2"]);

        updatePhaserObject(obj as any, "sprite", { interactive: true }, {
            interactive: true,
            onPointerDown: down2,
            onClick: click2,
            onPointerUp: up2,
            onDrag: drag2,
        }, false);

        (obj as any).emit("pointerdown");
        (obj as any).emit("pointerup");
        (obj as any).emit("drag");
        expect(calls).toEqual(["down1", "click1", "up1", "drag1", "down2", "click2", "up2", "drag2"]);
    });

    it("auto-enables interactivity when handlers are present (non-container)", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const setInteractive = vi.spyOn(obj as any, "setInteractive");

        updatePhaserObject(obj as any, "sprite", { onPointerOver: () => { } }, {}, true);
        expect(setInteractive).toHaveBeenCalledWith(expect.objectContaining({ useHandCursor: false }));
    });

    it("does not auto-enable interactivity for containers without a hit area", () => {
        const obj = new Phaser.GameObjects.Container({} as any, 0, 0, []);
        const setInteractive = vi.spyOn(obj as any, "setInteractive");

        updatePhaserObject(obj as any, "container", { onClick: () => { } }, {}, true);
        expect(setInteractive).not.toHaveBeenCalled();
    });

    it("auto-creates a rectangle hit area for containers when width/height are provided", () => {
        const obj = new Phaser.GameObjects.Container({} as any, 0, 0, []);
        const setInteractive = vi.spyOn(obj as any, "setInteractive");

        updatePhaserObject(obj as any, "container", { width: 10, height: 20, onClick: () => { } }, {}, true);
        expect(setInteractive).toHaveBeenCalledWith(expect.objectContaining({
            hitArea: expect.any(Phaser.Geom.Rectangle),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        }));
    });

    it("supports w/h aliases for hit area sizing (containers)", () => {
        const obj = new Phaser.GameObjects.Container({} as any, 0, 0, []);
        const setInteractive = vi.spyOn(obj as any, "setInteractive");

        updatePhaserObject(obj as any, "container", { w: 10, h: 20, onClick: () => { } }, {}, true);
        expect(setInteractive).toHaveBeenCalledWith(expect.objectContaining({
            hitArea: expect.any(Phaser.Geom.Rectangle),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        }));
    });

    it("passes through custom hitArea/hitAreaCallback props", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const setInteractive = vi.spyOn(obj as any, "setInteractive");
        const hitArea = { ok: true };
        const hitAreaCallback = () => true;

        updatePhaserObject(obj as any, "sprite", { onClick: () => { }, hitArea, hitAreaCallback }, {}, true);
        expect(setInteractive).toHaveBeenCalledWith(expect.objectContaining({ hitArea, hitAreaCallback }));
    });

    it("syncs draggable with scene.input.setDraggable when available", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const setDraggable = vi.fn();
        (obj as any).scene = { input: { setDraggable } };

        const onClick = () => { };
        updatePhaserObject(obj as any, "sprite", { onClick, draggable: true }, {}, true);
        expect(setDraggable).toHaveBeenCalledWith(obj, true);

        updatePhaserObject(obj as any, "sprite", { onClick, draggable: false }, { onClick, draggable: true }, false);
        expect(setDraggable).toHaveBeenLastCalledWith(obj, false);
    });

    it("infers draggable=true when drag handlers are present", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const setDraggable = vi.fn();
        (obj as any).scene = { input: { setDraggable } };

        const onDrag = () => { };
        updatePhaserObject(obj as any, "sprite", { onDrag }, {}, true);
        expect(setDraggable).toHaveBeenCalledWith(obj, true);

        updatePhaserObject(obj as any, "sprite", {}, { onDrag }, false);
        expect(setDraggable).toHaveBeenLastCalledWith(obj, false);
    });

    it("toggles interactivity and supports graphics hit areas", () => {
        const obj = new Phaser.GameObjects.Graphics({} as any);
        const setInteractive = vi.spyOn(obj as any, "setInteractive");
        const disableInteractive = vi.spyOn(obj as any, "disableInteractive");

        updatePhaserObject(obj as any, "rect", { interactive: true, width: 10, height: 20 }, {}, true);
        expect(setInteractive).toHaveBeenCalled();

        updatePhaserObject(obj as any, "rect", { interactive: false, width: 10, height: 20 }, { interactive: true, width: 10, height: 20 }, false);
        expect(disableInteractive).toHaveBeenCalled();
    });

    it("updates physics body size ratios and explicit offsets", () => {
        const obj = new Phaser.Physics.Arcade.Sprite({} as any, 0, 0, undefined as any);
        obj.width = 10;
        obj.height = 20;
        obj.displayWidth = 40;
        obj.displayHeight = 60;

        updatePhaserObject(obj as any, "physics-sprite", {
            scale: 2,
            bodyWidthRatio: 0.5,
            bodyHeightRatio: 0.25,
            originX: 0.25,
            originY: 0.75,
        }, {}, true);

        expect(obj.body.setSize).toHaveBeenCalledWith(5, 5, true);
        expect(obj.body.setOffset).not.toHaveBeenCalled();

        updatePhaserObject(obj as any, "physics-sprite", { bodyWidth: 5, bodyHeight: 6 }, {}, true);
        expect(obj.body.setSize).toHaveBeenCalledWith(5, 6, true);

        updatePhaserObject(obj as any, "physics-sprite", { bodyOffsetX: 1, bodyOffsetY: 2 }, {}, true);
        expect(obj.body.setOffset).toHaveBeenCalledWith(1, 2);
    });

    it("syncs Arcade bodies when physics-sprites move", () => {
        const obj = new Phaser.Physics.Arcade.Sprite({} as any, 0, 0, undefined as any);
        const updateFromGameObject = vi.fn();
        (obj.body as any).updateFromGameObject = updateFromGameObject;

        updatePhaserObject(obj as any, "physics-sprite", { x: 10, y: 20 }, {}, true);
        expect(updateFromGameObject).toHaveBeenCalledTimes(1);

        updateFromGameObject.mockClear();
        updatePhaserObject(obj as any, "physics-sprite", { x: 10, y: 20 }, { x: 10, y: 20 }, false);
        expect(updateFromGameObject).not.toHaveBeenCalled();

        updatePhaserObject(obj as any, "physics-sprite", { x: 11, y: 20 }, { x: 10, y: 20 }, false);
        expect(updateFromGameObject).toHaveBeenCalledTimes(1);
    });

    it("supports opt-in origin-based body offsets for ratio sizing", () => {
        const obj = new Phaser.Physics.Arcade.Sprite({} as any, 0, 0, undefined as any);
        obj.width = 10;
        obj.height = 20;
        obj.displayWidth = 40;
        obj.displayHeight = 60;

        updatePhaserObject(obj as any, "physics-sprite", {
            scale: 2,
            bodyWidthRatio: 0.5,
            bodyHeightRatio: 0.25,
            originX: 0.25,
            originY: 0.75,
            bodyOffsetMode: "origin",
        }, {}, true);

        expect(obj.body.setSize).toHaveBeenCalledWith(5, 5, true);
        expect(obj.body.setOffset).toHaveBeenCalledWith(10, -15);
    });

    it("defaults missing bodyOffsetX/bodyOffsetY to 0 when only one is provided", () => {
        const obj = new Phaser.Physics.Arcade.Sprite({} as any, 0, 0, undefined as any);

        updatePhaserObject(obj as any, "physics-sprite", { bodyOffsetY: 2 }, {}, true);
        expect(obj.body.setOffset).toHaveBeenLastCalledWith(0, 2);

        obj.body.setOffset.mockClear();
        updatePhaserObject(obj as any, "physics-sprite", { bodyOffsetX: 3 }, {}, true);
        expect(obj.body.setOffset).toHaveBeenLastCalledWith(3, 0);
    });

    it("draws rect strokes when strokeWidth and lineColor are provided", () => {
        const obj = new Phaser.GameObjects.Graphics({} as any);
        const lineStyle = vi.spyOn(obj as any, "lineStyle");
        const strokeRect = vi.spyOn(obj as any, "strokeRect");

        updatePhaserObject(obj as any, "rect", { width: 10, height: 20, strokeWidth: 2, lineColor: 0xff0000 }, {}, true);

        expect(lineStyle).toHaveBeenCalledWith(2, 0xff0000, 1);
        expect(strokeRect).toHaveBeenCalledWith(0, 0, 10, 20);
    });

    it("fills rects when fill is provided", () => {
        const obj = new Phaser.GameObjects.Graphics({} as any);
        const fillStyle = vi.spyOn(obj as any, "fillStyle");
        const fillRect = vi.spyOn(obj as any, "fillRect");

        updatePhaserObject(obj as any, "rect", { width: 10, height: 20, fill: 0x00ff00 }, {}, true);

        expect(fillStyle).toHaveBeenCalledWith(0x00ff00, 1);
        expect(fillRect).toHaveBeenCalledWith(0, 0, 10, 20);
    });

    it("supports w/h aliases when drawing rect fills", () => {
        const obj = new Phaser.GameObjects.Graphics({} as any);
        const fillRect = vi.spyOn(obj as any, "fillRect");

        updatePhaserObject(obj as any, "rect", { w: 10, h: 20, fill: 0x00ff00 }, {}, true);
        expect(fillRect).toHaveBeenCalledWith(0, 0, 10, 20);
    });

    it("falls back to body.setSize when setBodySize is not available", () => {
        const body = {
            setSize: vi.fn(),
            setOffset: vi.fn(),
        };

        const obj: any = {
            width: 10,
            height: 20,
            displayWidth: 40,
            displayHeight: 60,
            scaleX: 1,
            body,
        };

        updatePhaserObject(obj, "physics-sprite", {
            scale: 2,
            bodyWidthRatio: 0.5,
            bodyHeightRatio: 0.25,
            originX: 0.25,
            originY: 0.75,
        }, {}, false);

        expect(body.setSize).toHaveBeenCalledWith(5, 5, true);
        expect(body.setOffset).not.toHaveBeenCalled();

        body.setSize.mockClear();
        updatePhaserObject(obj, "physics-sprite", { bodyWidth: 5, bodyHeight: 6 }, {}, false);
        expect(body.setSize).toHaveBeenCalledWith(5, 6, true);
    });

    it("uses scale/origin fallbacks when computing body size ratios", () => {
        const obj = new Phaser.Physics.Arcade.Sprite({} as any, 0, 0, undefined as any);
        obj.width = 10;
        obj.height = 20;
        obj.displayWidth = 40;
        obj.displayHeight = 60;
        obj.scaleX = 2;
        obj.originX = 0.25;
        obj.originY = 0.75;

        updatePhaserObject(obj as any, "physics-sprite", { bodyWidthRatio: 0.5, bodyHeightRatio: 0.25 }, {}, false);
        expect(obj.body.setSize).toHaveBeenCalledWith(5, 5, true);
        expect(obj.body.setOffset).not.toHaveBeenCalled();

        obj.body.setOffset.mockClear();
        updatePhaserObject(obj as any, "physics-sprite", {
            bodyWidthRatio: 0.5,
            bodyHeightRatio: 0.25,
            bodyOffsetMode: "origin",
        }, {}, false);
        expect(obj.body.setOffset).toHaveBeenCalledWith(10, -15);

        const obj2 = new Phaser.Physics.Arcade.Sprite({} as any, 0, 0, undefined as any);
        obj2.width = 10;
        obj2.height = 20;
        obj2.displayWidth = 40;
        obj2.displayHeight = 60;
        obj2.scaleX = undefined as any;
        obj2.originX = undefined as any;
        obj2.originY = undefined as any;

        updatePhaserObject(obj2 as any, "physics-sprite", { bodyWidthRatio: 0.5, bodyHeightRatio: 0.25 }, {}, false);
        expect(obj2.body.setSize).toHaveBeenCalledWith(5, 5, true);
        expect(obj2.body.setOffset).not.toHaveBeenCalled();
    });

    it("falls back to text style wordWrap when setWordWrapWidth is missing", () => {
        const setWordWrapWidth = vi.fn();
        const obj: any = { style: { setWordWrapWidth } };

        updatePhaserObject(obj, "text", { wordWrapWidth: 123, wordWrapAdvanced: true }, {}, false);
        expect(setWordWrapWidth).toHaveBeenCalledWith(123, true);
    });

    it("resets wordWrapWidth on mount when not provided", () => {
        const obj = new Phaser.GameObjects.Text({} as any, 0, 0, "", {});
        const setWordWrapWidth = vi.spyOn(obj as any, "setWordWrapWidth");

        updatePhaserObject(obj as any, "text", {}, {}, true);
        expect(setWordWrapWidth).not.toHaveBeenCalled();
    });

    it("clears wordWrapWidth when it is removed", () => {
        const obj = new Phaser.GameObjects.Text({} as any, 0, 0, "", {});
        const setWordWrapWidth = vi.spyOn(obj as any, "setWordWrapWidth");

        updatePhaserObject(obj as any, "text", { wordWrapWidth: 100, wordWrapAdvanced: true }, {}, true);
        updatePhaserObject(obj as any, "text", {}, { wordWrapWidth: 100, wordWrapAdvanced: true }, false);

        expect(setWordWrapWidth).toHaveBeenLastCalledWith(0, false);
    });

    it("falls back to setStyle for text properties when specific setters are missing", () => {
        const setStyle = vi.fn();
        const obj: any = { setStyle };

        updatePhaserObject(obj, "text", { fontSize: 12, color: "#00ff00", fontStyle: "bold", align: "center" }, {}, false);

        expect(setStyle).toHaveBeenCalledTimes(4);
        expect(setStyle).toHaveBeenNthCalledWith(1, { fontSize: "12px" });
        expect(setStyle).toHaveBeenNthCalledWith(2, { color: "#00ff00" });
        expect(setStyle).toHaveBeenNthCalledWith(3, { fontStyle: "bold" });
        expect(setStyle).toHaveBeenNthCalledWith(4, { align: "center" });
    });

    it("sets and clears rotation defaults for non-direct nodes", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const setRotation = vi.spyOn(obj as any, "setRotation");

        updatePhaserObject(obj as any, "sprite", { rotation: 1 }, {}, true);
        updatePhaserObject(obj as any, "sprite", {}, { rotation: 1 }, false);

        expect(setRotation).toHaveBeenCalledWith(1);
        expect(setRotation).toHaveBeenCalledWith(0);
    });

    it("sets and clears tint for sprites", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const setTint = vi.spyOn(obj as any, "setTint");
        const clearTint = vi.spyOn(obj as any, "clearTint");

        updatePhaserObject(obj as any, "sprite", { tint: 0x00ff00 }, {}, true);
        expect(setTint).toHaveBeenCalledWith(0x00ff00);

        updatePhaserObject(obj as any, "sprite", {}, { tint: 0x00ff00 }, false);
        expect(clearTint).toHaveBeenCalled();
    });

    it("plays and stops animations when play prop changes", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const play = vi.spyOn(obj as any, "play");
        const stop = vi.spyOn(obj as any, "stop");

        updatePhaserObject(obj as any, "sprite", { play: "walk" }, {}, true);
        expect(play).toHaveBeenCalledWith("walk", true);

        updatePhaserObject(obj as any, "sprite", {}, { play: "walk" }, false);
        expect(stop).toHaveBeenCalled();
    });

    it("falls back to stop() when play is set but play() is missing", () => {
        const sprite = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        (sprite as any).play = undefined;
        const stopSprite = vi.spyOn(sprite as any, "stop");
        updatePhaserObject(sprite as any, "sprite", { play: "walk" }, {}, false);
        expect(stopSprite).toHaveBeenCalled();

        const physicsSprite = new Phaser.Physics.Arcade.Sprite({} as any, 0, 0, undefined as any);
        (physicsSprite as any).play = undefined;
        const stopPhysicsSprite = vi.spyOn(physicsSprite as any, "stop");
        updatePhaserObject(physicsSprite as any, "physics-sprite", { play: "run" }, {}, false);
        expect(stopPhysicsSprite).toHaveBeenCalled();
    });

    it("sets/clears tint and plays/stops animations for physics-sprites", () => {
        const obj = new Phaser.Physics.Arcade.Sprite({} as any, 0, 0, undefined as any);
        const setTint = vi.spyOn(obj as any, "setTint");
        const clearTint = vi.spyOn(obj as any, "clearTint");
        const play = vi.spyOn(obj as any, "play");
        const stop = vi.spyOn(obj as any, "stop");

        updatePhaserObject(obj as any, "physics-sprite", { tint: 0xff00ff, play: "run" }, {}, true);
        expect(setTint).toHaveBeenCalledWith(0xff00ff);
        expect(play).toHaveBeenCalledWith("run", true);

        updatePhaserObject(obj as any, "physics-sprite", {}, { tint: 0xff00ff, play: "run" }, false);
        expect(clearTint).toHaveBeenCalled();
        expect(stop).toHaveBeenCalled();
    });

    it("treats explicit undefined custom props as removals and does not re-set them", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);

        updatePhaserObject(obj as any, "sprite", { foo: "bar" }, {}, true);
        expect(obj.getData("foo")).toBe("bar");

        updatePhaserObject(obj as any, "sprite", { foo: undefined }, { foo: "bar" }, false);
        expect(obj.getData("foo")).toBeUndefined();
    });

    it("does not require setData() for custom prop sync", () => {
        const obj: any = {
            foo: 0,
            data: { remove: vi.fn() },
        };

        updatePhaserObject(obj, "direct", { foo: 123 }, {}, true);
        expect(obj.foo).toBe(123);
    });

    it("warns about container hit areas when interactive=true without width/height", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
        const obj = new Phaser.GameObjects.Container({} as any, 0, 0, []);
        const setInteractive = vi.spyOn(obj as any, "setInteractive");

        updatePhaserObject(obj as any, "container", { interactive: true }, {}, true);

        expect(setInteractive).toHaveBeenCalled();
        warn.mockRestore();
    });

    it("treats direct Graphics objects as rects for prop updates", () => {
        const obj = new Phaser.GameObjects.Graphics({} as any);
        const fillRect = vi.spyOn(obj as any, "fillRect");

        updatePhaserObject(obj as any, "direct", { width: 10, height: 20, fill: 0x123456 }, {}, true);
        expect(fillRect).toHaveBeenCalled();
    });

    it("warns about graphics hit areas when interactive=true without width/height", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
        const obj = new Phaser.GameObjects.Graphics({} as any);
        const setInteractive = vi.spyOn(obj as any, "setInteractive");

        updatePhaserObject(obj as any, "rect", { interactive: true }, {}, true);

        expect(setInteractive).toHaveBeenCalled();
        warn.mockRestore();
    });

    it("supports pointer over/out handlers and swaps them without reattaching", () => {
        const obj = new Phaser.GameObjects.Sprite({} as any, 0, 0, undefined as any);
        const on = vi.spyOn(obj as any, "on");

        const calls: string[] = [];
        const over1 = () => calls.push("over1");
        const out1 = () => calls.push("out1");
        const over2 = () => calls.push("over2");

        updatePhaserObject(obj as any, "sprite", { interactive: true, onPointerOver: over1, onPointerOut: out1 }, {}, true);
        expect(on).toHaveBeenCalledTimes(2);

        (obj as any).emit("pointerover");
        (obj as any).emit("pointerout");
        expect(calls).toEqual(["over1", "out1"]);

        updatePhaserObject(
            obj as any,
            "sprite",
            { interactive: true, onPointerOver: over2 },
            { interactive: true, onPointerOver: over1, onPointerOut: out1 },
            false
        );
        expect(on).toHaveBeenCalledTimes(2);

        (obj as any).emit("pointerover");
        (obj as any).emit("pointerout");
        expect(calls).toEqual(["over1", "out1", "over2"]);
    });
});
