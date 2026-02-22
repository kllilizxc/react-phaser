# React Phaser

A custom React-style Phaser renderer that allows you to build Phaser scene graphs declaratively using VNodes and hooks.

## Installation

```bash
npm install @realizer/react-phaser
```

## Quick Start

1. **Mount the UI/game tree** from a Phaser scene with `mountRoot(scene, GameRoot)`.
2. **Build the scene graph** by returning `VNode`s from function components.
3. **Use hooks** for side effects and per-frame logic; keep component render output pure.

```ts
import { mountRoot, createNode, useUpdate } from '@realizer/react-phaser';

function Player({ x, y }) {
  const ref = useRef(null);

  useUpdate(() => {
    if (ref.current) {
      ref.current.x += 1;
    }
  });

  return createNode('physics-sprite', {
    ref,
    x,
    y,
    texture: 'player',
  });
}

// In your Phaser Scene
class MyScene extends Phaser.Scene {
  create() {
    mountRoot(this, createNode(Player, { x: 100, y: 100 }));
  }
}
```

## Features

### Render Primitives (VNode types)

Create nodes with `createNode(type, props, ...children)`. Supported types:

- `container`: Group children; supports `x`, `y`, `width`, `height`, `interactive`, and pointer handlers.
- `text`: `x`, `y`, `text`, `fontSize`, `color`, `fontStyle`, `originX`, `originY`.
- `rect` (graphics-backed rectangle): `x`, `y`, `width`, `height`, `fill`, `alpha`, `strokeWidth`, `lineColor`, `interactive`.
- `image` / `sprite`: `x`, `y`, `texture`, `frame`, `scale`, `tint`, `flipX`, `flipY`, `play`.
- `physics-sprite`: Sprite props plus `velocityX`, `velocityY`, `collideWorldBounds`, `bounce`, `drag`, `gravityY`, `immovable`, and body sizing.
- `physics-group`: Pooled `Arcade.Sprite` group; pass `{ config }` and render `physics-sprite` children.

### Keys and Pooling

- Use `key` props for list children to maintain stable identity.
- `physics-group` manages object pooling via `group.get()`.

### Hooks

- `useState`: Manage local component state.
- `useStore(storeHook, selector?)`: Subscribe to state stores.
- `useUpdate(cb)`: Run logic every Phaser `update` event.
- `useEffect` / `useLayoutEffect`: Handle side effects and lifecycle.
- `useScene`: Access the current `Phaser.Scene`.
- `onMount`: Run code once after the first commit.

### Interactivity

- Set `interactive: true` on supported nodes.
- Use `onClick`, `onPointerOver`, `onPointerOut`, and `useHandCursor` props.

### Metadata Sync

- Props not handled by the renderer or physics are automatically synced to Phaser’s Data Manager (`obj.setData(key, value)`).

## License

MIT
