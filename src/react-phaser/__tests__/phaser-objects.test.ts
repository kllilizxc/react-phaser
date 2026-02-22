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
        expect(createPhaserObject(scene as any, "sprite", { texture: "t" })).toBeInstanceOf(Phaser.GameObjects.Sprite);
        expect(createPhaserObject(scene as any, "image", { texture: "t" })).toBeInstanceOf(Phaser.GameObjects.Image);
        expect(createPhaserObject(scene as any, "physics-sprite", { texture: "t" })).toBeInstanceOf(Phaser.Physics.Arcade.Sprite);
        expect(createPhaserObject(scene as any, "physics-group", { config: {} })).toBeInstanceOf(Phaser.Physics.Arcade.Group);
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

    it("toggles interactivity and supports graphics hit areas", () => {
        const obj = new Phaser.GameObjects.Graphics({} as any);
        const setInteractive = vi.spyOn(obj as any, "setInteractive");
        const disableInteractive = vi.spyOn(obj as any, "disableInteractive");

        updatePhaserObject(obj as any, "rect", { interactive: true, width: 10, height: 20 }, {}, true);
        expect(setInteractive).toHaveBeenCalled();

        updatePhaserObject(obj as any, "rect", { interactive: false, width: 10, height: 20 }, { interactive: true, width: 10, height: 20 }, false);
        expect(disableInteractive).toHaveBeenCalled();
    });

    it("updates physics body size ratios and offsets", () => {
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

        expect(obj.body.setSize).toHaveBeenCalledWith(10, 10, true);
        expect(obj.body.setOffset).toHaveBeenCalledWith(10, -15);

        updatePhaserObject(obj as any, "physics-sprite", { bodyWidth: 5, bodyHeight: 6 }, {}, true);
        expect(obj.body.setSize).toHaveBeenCalledWith(5, 6, true);

        updatePhaserObject(obj as any, "physics-sprite", { bodyOffsetX: 1, bodyOffsetY: 2 }, {}, true);
        expect(obj.body.setOffset).toHaveBeenCalledWith(1, 2);
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

        expect(body.setSize).toHaveBeenCalledWith(10, 10, true);
        expect(body.setOffset).toHaveBeenCalledWith(10, -15);

        body.setSize.mockClear();
        updatePhaserObject(obj, "physics-sprite", { bodyWidth: 5, bodyHeight: 6 }, {}, false);
        expect(body.setSize).toHaveBeenCalledWith(5, 6, true);
    });

    it("falls back to text style wordWrap when setWordWrapWidth is missing", () => {
        const setWordWrapWidth = vi.fn();
        const obj: any = { style: { setWordWrapWidth } };

        updatePhaserObject(obj, "text", { wordWrapWidth: 123, wordWrapAdvanced: true }, {}, false);
        expect(setWordWrapWidth).toHaveBeenCalledWith(123, true);
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
