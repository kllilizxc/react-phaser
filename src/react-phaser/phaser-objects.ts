import Phaser from "phaser";
import { devWarnOnce } from "./dev";
import { ensureArcadeBodySyncPatched } from "./arcade-body-sync";

const INTERNAL_PROP_KEYS = new Set([
    "x", "y", "z", "depth", "w", "h",
    "width", "height",
    "alpha", "visible", "scale",
    "originX", "originY",
    "rotation",
    "interactive", "useHandCursor", "cursor", "pixelPerfect", "alphaTolerance", "dropZone", "hitArea", "hitAreaCallback", "draggable",
    "onClick",
    "onPointerDown", "onPointerUp", "onPointerMove", "onPointerOver", "onPointerOut",
    "onWheel",
    "onDragStart", "onDrag", "onDragEnd",
    "onDragEnter", "onDragLeave", "onDragOver", "onDrop",
    "texture", "frame", "tint", "flipX", "flipY", "play",
    "velocityX", "velocityY", "collideWorldBounds", "bounce", "drag", "gravityY", "immovable",
    "bodyWidth", "bodyHeight", "bodyWidthRatio", "bodyHeightRatio", "bodyOffsetX", "bodyOffsetY", "bodyOffsetMode",
    "text", "fontSize", "color", "fontStyle", "align", "wordWrapWidth", "wordWrapAdvanced",
    "fill", "strokeWidth", "lineColor",
    "config",
    "ref", "key", "children",
]);

export function createPhaserObject(scene: Phaser.Scene, type: string, props: any): Phaser.GameObjects.GameObject | Phaser.GameObjects.Group {
    let obj: any;
    switch (type) {
        case "container":
            obj = scene.add.container(props.x || 0, props.y || 0);
            break;
        case "text":
            obj = scene.add.text(props.x || 0, props.y || 0, props.text || "", {
                fontSize: props.fontSize ? (typeof props.fontSize === "number" ? `${props.fontSize}px` : props.fontSize) : "16px",
                color: props.color || "#ffffff",
                fontStyle: props.fontStyle || "normal",
                align: props.align,
                wordWrap: props.wordWrapWidth !== undefined ? { width: props.wordWrapWidth, useAdvancedWrap: props.wordWrapAdvanced ?? false } : undefined,
            });
            break;
        case "rect":
        case "graphics":
            obj = scene.add.graphics();
            break;
        case "sprite":
            obj = scene.add.sprite(props.x || 0, props.y || 0, props.texture, props.frame);
            break;
        case "image":
            obj = scene.add.image(props.x || 0, props.y || 0, props.texture, props.frame);
            break;
        case "physics-sprite":
            obj = scene.physics.add.sprite(props.x || 0, props.y || 0, props.texture, props.frame);
            ensureArcadeBodySyncPatched(obj);
            break;
        case "physics-group":
            obj = scene.physics.add.group(props.config || {});
            break;
        default:
            throw new Error(`Unknown node type: ${type}`);
    }

    updatePhaserObject(obj, type, props, {}, true); // Apply initial props
    return obj;
}

export function updatePhaserObject(obj: any, type: string, newProps: any, oldProps: any, isMount: boolean = false) {
    const isDirect = type === "direct";
    const applyDefaultsOnMount = isMount && !isDirect;
    const isArcadeSprite = obj instanceof Phaser.Physics.Arcade.Sprite;

    if (isArcadeSprite) {
        ensureArcadeBodySyncPatched(obj);
    }

    let shouldSyncArcadeBody = false;

    if (isMount || newProps.x !== oldProps.x) {
        if (newProps.x !== undefined) obj.x = newProps.x;
        else if (!isDirect && isMount) obj.x = 0;
        if (isArcadeSprite) shouldSyncArcadeBody = true;
    }
    if (isMount || newProps.y !== oldProps.y) {
        if (newProps.y !== undefined) obj.y = newProps.y;
        else if (!isDirect && isMount) obj.y = 0;
        if (isArcadeSprite) shouldSyncArcadeBody = true;
    }
    if (typeof obj.setAlpha === "function" && (isMount || newProps.alpha !== oldProps.alpha)) {
        if (newProps.alpha !== undefined) obj.setAlpha(newProps.alpha);
        else if (!isDirect) obj.setAlpha(1);
    }
    if (typeof obj.setVisible === "function" && (isMount || newProps.visible !== oldProps.visible)) {
        if (newProps.visible !== undefined) obj.setVisible(newProps.visible);
        else if (!isDirect) obj.setVisible(true);
    }
    if (typeof obj.setScale === "function" && (isMount || newProps.scale !== oldProps.scale)) {
        if (newProps.scale !== undefined) obj.setScale(newProps.scale);
        else if (!isDirect) obj.setScale(1);
        if (isArcadeSprite) shouldSyncArcadeBody = true;
    }

    // Origin handling
    if (typeof obj.setOrigin === "function" && (isMount || newProps.originX !== oldProps.originX || newProps.originY !== oldProps.originY)) {
        if (newProps.originX !== undefined) {
            obj.setOrigin(newProps.originX, newProps.originY ?? newProps.originX);
        } else if (!isDirect) {
            obj.setOrigin(0.5, 0.5); // Default for most things
        }
        if (isArcadeSprite) shouldSyncArcadeBody = true;
    }

    if (typeof obj.setRotation === "function" && (isMount || newProps.rotation !== oldProps.rotation)) {
        if (newProps.rotation !== undefined) obj.setRotation(newProps.rotation);
        else if (!isDirect) obj.setRotation(0);
    }

    // Depth / layering
    const newDepth = newProps.depth ?? newProps.z;
    const oldDepth = oldProps.depth ?? oldProps.z;
    if (typeof obj.setDepth === "function" && (isMount || newDepth !== oldDepth)) {
        if (newDepth !== undefined) obj.setDepth(newDepth);
        else if (!isDirect) obj.setDepth(0);
    }

    const nextWidth = newProps.width ?? newProps.w;
    const nextHeight = newProps.height ?? newProps.h;
    const prevWidth = oldProps.width ?? oldProps.w;
    const prevHeight = oldProps.height ?? oldProps.h;

    // Size (Must be set BEFORE interactive for containers)
    if (nextWidth !== prevWidth || nextHeight !== prevHeight) {
        if (typeof obj.setSize === "function" && nextWidth !== undefined && nextHeight !== undefined) {
            obj.setSize(nextWidth, nextHeight);
        }
    }

    // Interactivity
    const inputType = (() => {
        let t = type;
        if (t === "graphics") t = "rect";
        if (t === "direct") {
            if (obj instanceof Phaser.Physics.Arcade.Sprite) t = "physics-sprite";
            else if (obj instanceof Phaser.GameObjects.Sprite) t = "sprite";
            else if (obj instanceof Phaser.GameObjects.Image) t = "image";
            else if (obj instanceof Phaser.GameObjects.Text) t = "text";
            else if (obj instanceof Phaser.GameObjects.Container) t = "container";
            else if (obj instanceof Phaser.GameObjects.Graphics) t = "rect";
        }
        return t;
    })();

    const hasAnyDragHandlers = (props: any) => !!(
        props.onDragStart || props.onDrag || props.onDragEnd ||
        props.onDragEnter || props.onDragLeave || props.onDragOver || props.onDrop
    );

    const resolveDraggable = (props: any) =>
        (props.draggable !== undefined) ? !!props.draggable : hasAnyDragHandlers(props);

    const hasAnyInputHandlers = (props: any) => !!(
        props.onClick ||
        props.onPointerDown || props.onPointerUp || props.onPointerMove || props.onPointerOver || props.onPointerOut ||
        props.onWheel ||
        hasAnyDragHandlers(props)
    );

    const isHitAreaRequired = inputType === "rect" || inputType === "container";
    const canCreateRectHitArea = isHitAreaRequired && nextWidth !== undefined && nextHeight !== undefined;
    const hasHitArea = newProps.hitArea !== undefined || canCreateRectHitArea;

    const prevIsHitAreaRequired = inputType === "rect" || inputType === "container";
    const prevCanCreateRectHitArea = prevIsHitAreaRequired && prevWidth !== undefined && prevHeight !== undefined;
    const prevHasHitArea = oldProps.hitArea !== undefined || prevCanCreateRectHitArea;

    const nextInteractive =
        (newProps.interactive !== undefined)
            ? !!newProps.interactive
            : (!!(hasAnyInputHandlers(newProps) || newProps.draggable || newProps.dropZone) && (!isHitAreaRequired || hasHitArea));

    const prevInteractive =
        (oldProps.interactive !== undefined)
            ? !!oldProps.interactive
            : (!!(hasAnyInputHandlers(oldProps) || oldProps.draggable || oldProps.dropZone) && (!prevIsHitAreaRequired || prevHasHitArea));

    const nextResolvedDraggable = resolveDraggable(newProps);
    const prevResolvedDraggable = resolveDraggable(oldProps);

    const interactiveConfigChanged =
        (newProps.useHandCursor !== oldProps.useHandCursor) ||
        (newProps.cursor !== oldProps.cursor) ||
        (newProps.pixelPerfect !== oldProps.pixelPerfect) ||
        (newProps.alphaTolerance !== oldProps.alphaTolerance) ||
        (newProps.dropZone !== oldProps.dropZone) ||
        (nextResolvedDraggable !== prevResolvedDraggable) ||
        (newProps.hitArea !== oldProps.hitArea) ||
        (newProps.hitAreaCallback !== oldProps.hitAreaCallback) ||
        ((isHitAreaRequired && newProps.hitArea === undefined) && (nextWidth !== prevWidth || nextHeight !== prevHeight));

    if (prevInteractive !== nextInteractive || (nextInteractive && interactiveConfigChanged)) {
        if (nextInteractive) {
            const wantsHandCursor =
                (newProps.useHandCursor !== undefined)
                    ? newProps.useHandCursor
                    : !!(
                        newProps.onClick ||
                        newProps.onPointerDown || newProps.onPointerUp ||
                        newProps.onWheel ||
                        newProps.onDragStart || newProps.onDrag || newProps.onDragEnd ||
                        nextResolvedDraggable
                    );

            if (newProps.interactive && (inputType === "rect") && !hasHitArea) {
                devWarnOnce(
                    "react-phaser:interactive:graphics-missing-hitarea",
                    "react-phaser: 'rect'/'graphics' with interactive=true should specify width/height (or hitArea/hitAreaCallback) to create a hit area."
                );
            }
            if (newProps.interactive && inputType === "container" && !hasHitArea) {
                devWarnOnce(
                    "react-phaser:interactive:container-missing-hitarea",
                    "react-phaser: 'container' with interactive=true should specify width/height (or hitArea/hitAreaCallback); Containers have no intrinsic hit area."
                );
            }

            const config: any = { useHandCursor: wantsHandCursor };
            if (newProps.cursor !== undefined) config.cursor = newProps.cursor;
            if (newProps.pixelPerfect !== undefined) config.pixelPerfect = newProps.pixelPerfect;
            if (newProps.alphaTolerance !== undefined) config.alphaTolerance = newProps.alphaTolerance;

            if (newProps.dropZone !== undefined || oldProps.dropZone !== undefined) {
                config.dropZone = newProps.dropZone ?? false;
            }
            if (hasAnyDragHandlers(newProps) || hasAnyDragHandlers(oldProps) || newProps.draggable !== undefined || oldProps.draggable !== undefined) {
                config.draggable = nextResolvedDraggable;
            }

            if (newProps.hitArea !== undefined) {
                config.hitArea = newProps.hitArea;
                if (newProps.hitAreaCallback !== undefined) config.hitAreaCallback = newProps.hitAreaCallback;
            } else if (canCreateRectHitArea) {
                config.hitArea = new Phaser.Geom.Rectangle(0, 0, nextWidth, nextHeight);
                config.hitAreaCallback = Phaser.Geom.Rectangle.Contains;
            }

            obj.setInteractive(config);
        } else if (typeof obj.disableInteractive === "function") {
            obj.disableInteractive();
        }
    }

    // Draggable is sometimes scene-managed (Phaser's InputPlugin).
    // Keep it in sync when possible.
    const prevDraggable = prevInteractive ? prevResolvedDraggable : false;
    const nextDraggable = nextInteractive ? nextResolvedDraggable : false;
    if (prevDraggable !== nextDraggable) {
        const input = (obj as any)?.scene?.input;
        if (input && typeof input.setDraggable === "function") {
            input.setDraggable(obj, nextDraggable);
        }
    }

    // Event listeners
    // Attach stable internal wrappers once and swap the current handlers to avoid detach/attach churn.
    const hadHandlers = !!(
        oldProps.onClick ||
        oldProps.onPointerDown || oldProps.onPointerUp || oldProps.onPointerMove || oldProps.onPointerOver || oldProps.onPointerOut ||
        oldProps.onWheel ||
        oldProps.onDragStart || oldProps.onDrag || oldProps.onDragEnd ||
        oldProps.onDragEnter || oldProps.onDragLeave || oldProps.onDragOver || oldProps.onDrop
    );
    const hasHandlers = !!(
        newProps.onClick ||
        newProps.onPointerDown || newProps.onPointerUp || newProps.onPointerMove || newProps.onPointerOver || newProps.onPointerOut ||
        newProps.onWheel ||
        newProps.onDragStart || newProps.onDrag || newProps.onDragEnd ||
        newProps.onDragEnter || newProps.onDragLeave || newProps.onDragOver || newProps.onDrop
    );
    if ((hadHandlers || hasHandlers) && typeof obj.on === "function") {
        type HandlerState = {
            onClick?: (...args: any[]) => void;
            onPointerDown?: (...args: any[]) => void;
            onPointerUp?: (...args: any[]) => void;
            onPointerMove?: (...args: any[]) => void;
            onPointerOver?: (...args: any[]) => void;
            onPointerOut?: (...args: any[]) => void;
            onWheel?: (...args: any[]) => void;
            onDragStart?: (...args: any[]) => void;
            onDrag?: (...args: any[]) => void;
            onDragEnd?: (...args: any[]) => void;
            onDragEnter?: (...args: any[]) => void;
            onDragLeave?: (...args: any[]) => void;
            onDragOver?: (...args: any[]) => void;
            onDrop?: (...args: any[]) => void;
            pointerdown?: (...args: any[]) => void;
            pointerup?: (...args: any[]) => void;
            pointermove?: (...args: any[]) => void;
            pointerover?: (...args: any[]) => void;
            pointerout?: (...args: any[]) => void;
            wheel?: (...args: any[]) => void;
            dragstart?: (...args: any[]) => void;
            drag?: (...args: any[]) => void;
            dragend?: (...args: any[]) => void;
            dragenter?: (...args: any[]) => void;
            dragleave?: (...args: any[]) => void;
            dragover?: (...args: any[]) => void;
            drop?: (...args: any[]) => void;
        };

        const state: HandlerState = (obj as any).__v_inputHandlers || ((obj as any).__v_inputHandlers = {});

        state.onClick = (typeof newProps.onClick === "function") ? newProps.onClick : undefined;
        state.onPointerDown = (typeof newProps.onPointerDown === "function") ? newProps.onPointerDown : undefined;
        state.onPointerUp = (typeof newProps.onPointerUp === "function") ? newProps.onPointerUp : undefined;
        state.onPointerMove = (typeof newProps.onPointerMove === "function") ? newProps.onPointerMove : undefined;
        state.onPointerOver = (typeof newProps.onPointerOver === "function") ? newProps.onPointerOver : undefined;
        state.onPointerOut = (typeof newProps.onPointerOut === "function") ? newProps.onPointerOut : undefined;
        state.onWheel = (typeof newProps.onWheel === "function") ? newProps.onWheel : undefined;
        state.onDragStart = (typeof newProps.onDragStart === "function") ? newProps.onDragStart : undefined;
        state.onDrag = (typeof newProps.onDrag === "function") ? newProps.onDrag : undefined;
        state.onDragEnd = (typeof newProps.onDragEnd === "function") ? newProps.onDragEnd : undefined;
        state.onDragEnter = (typeof newProps.onDragEnter === "function") ? newProps.onDragEnter : undefined;
        state.onDragLeave = (typeof newProps.onDragLeave === "function") ? newProps.onDragLeave : undefined;
        state.onDragOver = (typeof newProps.onDragOver === "function") ? newProps.onDragOver : undefined;
        state.onDrop = (typeof newProps.onDrop === "function") ? newProps.onDrop : undefined;

        if ((oldProps.onClick || newProps.onClick || oldProps.onPointerDown || newProps.onPointerDown) && !state.pointerdown) {
            state.pointerdown = (...args: any[]) => {
                state.onPointerDown?.apply(obj, args);
                state.onClick?.apply(obj, args);
            };
            obj.on("pointerdown", state.pointerdown);
        }
        if ((oldProps.onPointerUp || newProps.onPointerUp) && !state.pointerup) {
            state.pointerup = (...args: any[]) => state.onPointerUp?.apply(obj, args);
            obj.on("pointerup", state.pointerup);
        }
        if ((oldProps.onPointerMove || newProps.onPointerMove) && !state.pointermove) {
            state.pointermove = (...args: any[]) => state.onPointerMove?.apply(obj, args);
            obj.on("pointermove", state.pointermove);
        }
        if ((oldProps.onPointerOver || newProps.onPointerOver) && !state.pointerover) {
            state.pointerover = (...args: any[]) => state.onPointerOver?.apply(obj, args);
            obj.on("pointerover", state.pointerover);
        }
        if ((oldProps.onPointerOut || newProps.onPointerOut) && !state.pointerout) {
            state.pointerout = (...args: any[]) => state.onPointerOut?.apply(obj, args);
            obj.on("pointerout", state.pointerout);
        }
        if ((oldProps.onWheel || newProps.onWheel) && !state.wheel) {
            state.wheel = (...args: any[]) => state.onWheel?.apply(obj, args);
            obj.on("wheel", state.wheel);
        }
        if ((oldProps.onDragStart || newProps.onDragStart) && !state.dragstart) {
            state.dragstart = (...args: any[]) => state.onDragStart?.apply(obj, args);
            obj.on("dragstart", state.dragstart);
        }
        if ((oldProps.onDrag || newProps.onDrag) && !state.drag) {
            state.drag = (...args: any[]) => state.onDrag?.apply(obj, args);
            obj.on("drag", state.drag);
        }
        if ((oldProps.onDragEnd || newProps.onDragEnd) && !state.dragend) {
            state.dragend = (...args: any[]) => state.onDragEnd?.apply(obj, args);
            obj.on("dragend", state.dragend);
        }
        if ((oldProps.onDragEnter || newProps.onDragEnter) && !state.dragenter) {
            state.dragenter = (...args: any[]) => state.onDragEnter?.apply(obj, args);
            obj.on("dragenter", state.dragenter);
        }
        if ((oldProps.onDragLeave || newProps.onDragLeave) && !state.dragleave) {
            state.dragleave = (...args: any[]) => state.onDragLeave?.apply(obj, args);
            obj.on("dragleave", state.dragleave);
        }
        if ((oldProps.onDragOver || newProps.onDragOver) && !state.dragover) {
            state.dragover = (...args: any[]) => state.onDragOver?.apply(obj, args);
            obj.on("dragover", state.dragover);
        }
        if ((oldProps.onDrop || newProps.onDrop) && !state.drop) {
            state.drop = (...args: any[]) => state.onDrop?.apply(obj, args);
            obj.on("drop", state.drop);
        }
    }

    // Type specific props
    let effectiveType = type;
    if (effectiveType === "graphics") effectiveType = "rect";
    if (type === "direct") {
        if (obj instanceof Phaser.Physics.Arcade.Sprite) effectiveType = "physics-sprite";
        else if (obj instanceof Phaser.GameObjects.Sprite) effectiveType = "sprite";
        else if (obj instanceof Phaser.GameObjects.Image) effectiveType = "image";
        else if (obj instanceof Phaser.GameObjects.Text) effectiveType = "text";
        else if (obj instanceof Phaser.GameObjects.Graphics) effectiveType = "rect";
    }

    switch (effectiveType) {
        case "text":
            if (newProps.text !== oldProps.text) obj.setText(newProps.text || "");
            if (applyDefaultsOnMount || newProps.fontSize !== oldProps.fontSize) {
                const fontSize = newProps.fontSize !== undefined
                    ? (typeof newProps.fontSize === "number" ? `${newProps.fontSize}px` : newProps.fontSize)
                    : "16px";
                if (typeof obj.setFontSize === "function") obj.setFontSize(fontSize);
                else if (typeof obj.setStyle === "function") obj.setStyle({ fontSize });
            }
            if (applyDefaultsOnMount || newProps.color !== oldProps.color) {
                const color = newProps.color ?? "#ffffff";
                if (typeof obj.setColor === "function") obj.setColor(color);
                else if (typeof obj.setStyle === "function") obj.setStyle({ color });
            }
            if (applyDefaultsOnMount || newProps.fontStyle !== oldProps.fontStyle) {
                const fontStyle = newProps.fontStyle ?? "normal";
                if (typeof obj.setFontStyle === "function") obj.setFontStyle(fontStyle);
                else if (typeof obj.setStyle === "function") obj.setStyle({ fontStyle });
            }
            if (applyDefaultsOnMount || newProps.align !== oldProps.align) {
                const align = newProps.align ?? "left";
                if (typeof obj.setAlign === "function") obj.setAlign(align);
                else if (typeof obj.setStyle === "function") obj.setStyle({ align });
            }
            const wrapRelevant =
                newProps.wordWrapWidth !== undefined ||
                oldProps.wordWrapWidth !== undefined ||
                newProps.wordWrapAdvanced !== undefined ||
                oldProps.wordWrapAdvanced !== undefined;
            const wrapChanged = newProps.wordWrapWidth !== oldProps.wordWrapWidth || newProps.wordWrapAdvanced !== oldProps.wordWrapAdvanced;
            if (wrapRelevant && (isMount || wrapChanged)) {
                const width = newProps.wordWrapWidth ?? 0;
                const useAdvanced = newProps.wordWrapAdvanced ?? false;
                if (typeof obj.setWordWrapWidth === "function") obj.setWordWrapWidth(width, useAdvanced);
                else if (obj.style && typeof obj.style.setWordWrapWidth === "function") obj.style.setWordWrapWidth(width, useAdvanced);
            }
            break;
        case "rect":
            // Only redraw graphics if properties changed
            if (nextWidth !== prevWidth || nextHeight !== prevHeight ||
                newProps.fill !== oldProps.fill ||
                newProps.strokeWidth !== oldProps.strokeWidth || newProps.lineColor !== oldProps.lineColor) {

                const g = obj as Phaser.GameObjects.Graphics;
                g.clear();
                if (newProps.fill !== undefined) {
                    g.fillStyle(newProps.fill, 1);
                    g.fillRect(0, 0, nextWidth || 0, nextHeight || 0);
                }
                if (newProps.strokeWidth && newProps.lineColor !== undefined) {
                    g.lineStyle(newProps.strokeWidth, newProps.lineColor, 1);
                    g.strokeRect(0, 0, nextWidth || 0, nextHeight || 0);
                }
            }
            break;
        case "sprite":
        case "image":
            if ((applyDefaultsOnMount || newProps.texture !== oldProps.texture || newProps.frame !== oldProps.frame) && newProps.texture !== undefined) {
                obj.setTexture(newProps.texture, newProps.frame);
            }
            if (applyDefaultsOnMount || newProps.tint !== oldProps.tint) {
                if (newProps.tint !== undefined) obj.setTint(newProps.tint);
                else obj.clearTint();
            }
            if (applyDefaultsOnMount || newProps.flipX !== oldProps.flipX) obj.setFlipX(newProps.flipX ?? false);
            if (applyDefaultsOnMount || newProps.flipY !== oldProps.flipY) obj.setFlipY(newProps.flipY ?? false);
            if (applyDefaultsOnMount || newProps.play !== oldProps.play) {
                if (newProps.play && typeof obj.play === "function") obj.play(newProps.play, true);
                else if (typeof obj.stop === "function") obj.stop();
            }
            break;
        case "physics-sprite":
            if ((applyDefaultsOnMount || newProps.texture !== oldProps.texture || newProps.frame !== oldProps.frame) && newProps.texture !== undefined) {
                obj.setTexture(newProps.texture, newProps.frame);
            }
            if (applyDefaultsOnMount || newProps.tint !== oldProps.tint) {
                if (newProps.tint !== undefined) obj.setTint(newProps.tint);
                else obj.clearTint();
            }
            if (applyDefaultsOnMount || newProps.flipX !== oldProps.flipX) obj.setFlipX(newProps.flipX ?? false);
            if (applyDefaultsOnMount || newProps.flipY !== oldProps.flipY) obj.setFlipY(newProps.flipY ?? false);
            if (applyDefaultsOnMount || newProps.play !== oldProps.play) {
                if (newProps.play && typeof obj.play === "function") obj.play(newProps.play, true);
                else if (typeof obj.stop === "function") obj.stop();
            }
            // Physics props
            if (applyDefaultsOnMount || newProps.velocityX !== oldProps.velocityX) obj.setVelocityX(newProps.velocityX ?? 0);
            if (applyDefaultsOnMount || newProps.velocityY !== oldProps.velocityY) obj.setVelocityY(newProps.velocityY ?? 0);
            if (applyDefaultsOnMount || newProps.collideWorldBounds !== oldProps.collideWorldBounds) {
                obj.setCollideWorldBounds(newProps.collideWorldBounds ?? false);
            }
            if (applyDefaultsOnMount || newProps.bounce !== oldProps.bounce) obj.setBounce(newProps.bounce ?? 0);
            if (applyDefaultsOnMount || newProps.drag !== oldProps.drag) obj.setDrag(newProps.drag ?? 0);
            if (applyDefaultsOnMount || newProps.gravityY !== oldProps.gravityY) obj.setGravityY(newProps.gravityY ?? 0);
            if (applyDefaultsOnMount || newProps.immovable !== oldProps.immovable) obj.setImmovable(newProps.immovable ?? false);

            if (applyDefaultsOnMount || newProps.texture !== oldProps.texture || newProps.frame !== oldProps.frame || newProps.bodyWidthRatio !== oldProps.bodyWidthRatio || newProps.bodyHeightRatio !== oldProps.bodyHeightRatio) {
                if (newProps.bodyWidthRatio !== undefined && newProps.bodyHeightRatio !== undefined) {
                    // Arcade body sizes are specified in *source* pixels. The physics body will
                    // automatically scale with the Sprite, so do not multiply by `scale` here.
                    const baseW = typeof obj.width === "number" ? obj.width : 0;
                    const baseH = typeof obj.height === "number" ? obj.height : 0;
                    const targetW = Math.max(1, baseW * newProps.bodyWidthRatio);
                    const targetH = Math.max(1, baseH * newProps.bodyHeightRatio);

                    if (typeof obj.setBodySize === "function") {
                        obj.setBodySize(targetW, targetH, true);
                    } else {
                        obj.body.setSize(targetW, targetH, true);
                    }

                    // Keep ratio-based bodies centered by default. Origin-based body shifting
                    // is opt-in to avoid surprising collider drift for non-default origins.
                    const bodyOffsetMode = newProps.bodyOffsetMode ?? "center";
                    if (bodyOffsetMode === "origin") {
                        const originX = newProps.originX ?? obj.originX ?? 0.5;
                        const originY = newProps.originY ?? obj.originY ?? 0.5;
                        if (originX !== 0.5 || originY !== 0.5) {
                            const offX = (0.5 - originX) * obj.displayWidth;
                            const offY = (0.5 - originY) * obj.displayHeight;
                            obj.body.setOffset(offX, offY);
                        }
                    }
                    shouldSyncArcadeBody = true;
                }
            }
            if (applyDefaultsOnMount || newProps.bodyWidth !== oldProps.bodyWidth || newProps.bodyHeight !== oldProps.bodyHeight) {
                if (newProps.bodyWidth !== undefined && newProps.bodyHeight !== undefined) {
                    if (typeof obj.setBodySize === "function") {
                        obj.setBodySize(newProps.bodyWidth, newProps.bodyHeight, true);
                    } else {
                        obj.body.setSize(newProps.bodyWidth, newProps.bodyHeight, true);
                    }
                    shouldSyncArcadeBody = true;
                }
            }
            if (applyDefaultsOnMount || newProps.bodyOffsetX !== oldProps.bodyOffsetX || newProps.bodyOffsetY !== oldProps.bodyOffsetY) {
                if (newProps.bodyOffsetX !== undefined || newProps.bodyOffsetY !== undefined) {
                    obj.body.setOffset(newProps.bodyOffsetX ?? 0, newProps.bodyOffsetY ?? 0);
                    shouldSyncArcadeBody = true;
                }
            }
            break;
    }

    if (shouldSyncArcadeBody && obj.body && typeof obj.body.updateFromGameObject === "function") {
        obj.body.updateFromGameObject();
    }

    // --- Data Manager & Property Sync ---
    // Sync any non-special props into Phaser's Data Manager so obj.getData(key) works.
    // Also try to set directly on the object if the property exists (for custom classes like Bullet)
    const removedDataKeys: string[] = [];
    if (obj.data && typeof obj.data.remove === "function") {
        for (const key in oldProps) {
            if (INTERNAL_PROP_KEYS.has(key)) continue;
            const hasNewValue = Object.prototype.hasOwnProperty.call(newProps, key) && newProps[key] !== undefined;
            if (!hasNewValue) removedDataKeys.push(key);
        }
    }
    if (removedDataKeys.length > 0) {
        obj.data.remove(removedDataKeys);
    }

    for (const key in newProps) {
        if (INTERNAL_PROP_KEYS.has(key)) continue;
        const value = newProps[key];
        if (value === undefined) continue;
        if (isMount || value !== oldProps[key]) {
            if (key in obj && typeof obj[key] !== "function") {
                obj[key] = value;
            }
            if (typeof obj.setData === "function") {
                obj.setData(key, value);
            }
        }
    }
}