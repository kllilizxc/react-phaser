import type Phaser from "phaser";

export type Key = string | number;

export type RefObject<T> = { current: T };

export type HostVNodeType =
    | "text"
    | "graphics"
    | "image"
    | "sprite"
    | "physics-sprite"
    | "physics-group"
    | "container"
    | "fragment"
    | "rect"
    | "direct";

export type ComponentType<P = any> = (props: P) => VNode | null;

export type VNodeType = HostVNodeType | ComponentType<any> | Phaser.GameObjects.GameObject | Phaser.GameObjects.Group;

export type PointerHandler = (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => void;

export type PointerOutHandler = (pointer: Phaser.Input.Pointer, event: Phaser.Types.Input.EventData) => void;

export type DragStartHandler = (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => void;

export type DragHandler = (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => void;

export type DragEndHandler = (pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean) => void;

export type DragTargetHandler = (pointer: Phaser.Input.Pointer, target: Phaser.GameObjects.GameObject) => void;

export type WheelHandler = (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number, deltaZ: number, event: Phaser.Types.Input.EventData) => void;

export type HitAreaCallback = Phaser.Types.Input.HitAreaCallback;

export interface BaseProps {
    key?: Key;
    ref?: RefObject<any>;
    x?: number;
    y?: number;
    z?: number;
    depth?: number;
    w?: number;
    h?: number;
    width?: number;
    height?: number;
    alpha?: number;
    visible?: boolean;
    scale?: number;
    originX?: number;
    originY?: number;
    rotation?: number;
    interactive?: boolean;
    useHandCursor?: boolean;
    cursor?: string;
    pixelPerfect?: boolean;
    alphaTolerance?: number;
    dropZone?: boolean;
    hitArea?: any;
    hitAreaCallback?: HitAreaCallback;
    onClick?: PointerHandler;
    onPointerDown?: PointerHandler;
    onPointerUp?: PointerHandler;
    onPointerMove?: PointerHandler;
    onPointerOver?: PointerHandler;
    onPointerOut?: PointerOutHandler;
    onWheel?: WheelHandler;
    onDragStart?: DragStartHandler;
    onDrag?: DragHandler;
    onDragEnd?: DragEndHandler;
    onDragEnter?: DragTargetHandler;
    onDragLeave?: DragTargetHandler;
    onDragOver?: DragTargetHandler;
    onDrop?: DragTargetHandler;
    draggable?: boolean;
    [key: string]: any;
}

export interface ContainerProps extends BaseProps {
    ref?: RefObject<Phaser.GameObjects.Container | null>;
}

export interface TextProps extends BaseProps {
    ref?: RefObject<Phaser.GameObjects.Text | null>;
    text?: string;
    fontSize?: string | number;
    color?: string;
    fontStyle?: string;
    align?: string;
    wordWrapWidth?: number;
    wordWrapAdvanced?: boolean;
}

export interface GraphicsProps extends BaseProps {
    ref?: RefObject<Phaser.GameObjects.Graphics | null>;
    fill?: number;
    strokeWidth?: number;
    lineColor?: number;
}

export interface SpriteProps extends BaseProps {
    ref?: RefObject<Phaser.GameObjects.Sprite | null>;
    texture?: string;
    frame?: string | number;
    tint?: number;
    flipX?: boolean;
    flipY?: boolean;
    play?: string;
}

export interface ImageProps extends BaseProps {
    ref?: RefObject<Phaser.GameObjects.Image | null>;
    texture?: string;
    frame?: string | number;
    tint?: number;
    flipX?: boolean;
    flipY?: boolean;
}

export interface PhysicsSpriteProps extends SpriteProps {
    ref?: RefObject<Phaser.Physics.Arcade.Sprite | null>;
    velocityX?: number;
    velocityY?: number;
    collideWorldBounds?: boolean;
    bounce?: number;
    drag?: number;
    gravityY?: number;
    immovable?: boolean;
    bodyWidth?: number;
    bodyHeight?: number;
    bodyWidthRatio?: number;
    bodyHeightRatio?: number;
    bodyOffsetX?: number;
    bodyOffsetY?: number;
}

export interface PhysicsGroupProps extends BaseProps {
    ref?: RefObject<Phaser.Physics.Arcade.Group | null>;
    config?: Phaser.Types.Physics.Arcade.PhysicsGroupConfig;
}

export interface FragmentProps {
    key?: Key;
}

export interface VNode<TType extends VNodeType = VNodeType, TProps extends Record<string, any> = Record<string, any>> {
    type: TType;
    key?: Key;
    props: TProps;
    children: VNode[];
}

export type VChild = VNode | null | undefined | false;

export type PhaserHost = Phaser.GameObjects.GameObject | Phaser.GameObjects.Group;
