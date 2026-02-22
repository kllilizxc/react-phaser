import { describe, expect, it } from "vitest";
import { createNode } from "../create-node";

describe("createNode", () => {
    it("filters falsy children", () => {
        const child = createNode("text", { text: "hi" });
        const vnode = createNode("container", {}, child, null, false, undefined);
        expect(vnode.children).toEqual([child]);
    });

    it("defaults props to an object when omitted", () => {
        const vnode = createNode("text");
        expect(vnode.props).toEqual({});
    });

    it("sets key from props", () => {
        const vnode = createNode("text", { key: 123, text: "x" });
        expect(vnode.key).toBe(123);
    });

    it("supports fragment nodes", () => {
        const vnode = createNode("fragment", {}, createNode("text", { text: "a" }));
        expect(vnode.type).toBe("fragment");
        expect(vnode.children).toHaveLength(1);
    });
});
