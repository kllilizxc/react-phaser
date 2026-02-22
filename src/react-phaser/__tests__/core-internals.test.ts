import { describe, expect, it, vi } from "vitest";
import { ComponentInstance } from "../core";
import { createMockScene } from "./test-utils";

describe("react-phaser core internals", () => {
    it("ComponentInstance.unmount runs subscriptions and destroys HostSlots", () => {
        const scene = createMockScene();
        const instance = new ComponentInstance(scene as any, () => null, {}, undefined, null);

        const unsub = vi.fn();
        instance.addSubscription(unsub);

        const sprite = scene.add.sprite(0, 0, "t") as any;
        const destroySpy = vi.spyOn(sprite, "destroy");

        const slot: any = { __v_slot: true, kind: "create", expectedType: "sprite", current: sprite };
        instance.phaserObject = slot;

        instance.unmount();

        expect(unsub).toHaveBeenCalledTimes(1);
        expect(destroySpy).toHaveBeenCalledTimes(1);
        expect(slot.current).toBeNull();
    });
});

