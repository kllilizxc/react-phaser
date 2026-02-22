# @realiz3r/react-phaser

[![npm version](https://img.shields.io/npm/v/@realiz3r/react-phaser.svg?style=flat-square)](https://www.npmjs.com/package/@realiz3r/react-phaser)
[![license](https://img.shields.io/npm/l/@realiz3r/react-phaser.svg?style=flat-square)](https://github.com/kllilizxc/react-phaser/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@realiz3r/react-phaser?style=flat-square)](https://bundlephobia.com/package/@realiz3r/react-phaser)

A lightweight, high-performance, React-style renderer for Phaser 3. Build your game worlds declaratively using components, hooks, and object pooling.

---

## 🌟 Why React Phaser?

Managing complex state and game object hierarchies in Phaser usually leads to imperative "spaghetti code." This library provides a **declarative abstraction layer** without sacrificing Phaser's performance.

- **Declarative Composition**: Use functional components to describe your scene graph.
- **Hook-based Logic**: First-class support for `useState`, `useEffect`, and native Phaser lifecycles via `useUpdate`.
- **Lightweight State Management**: Built-in Pinia-style reactive stores with auto-logging.
- **Optimized Pooling**: First-class support for Phaser Arcade Physics pooling.

## 🚀 Installation

```bash
npm install @realiz3r/react-phaser
```

> [!NOTE]
> This library requires **Phaser 3.60+** and targets **ES2020+**.

## 📖 Quick Start

Demo project: [SpaceShooterGame](https://github.com/kllilizxc/SpaceShooterGame)

```typescript
import { mountRoot, createNode, useUpdate, useRef } from '@realiz3r/react-phaser';

function Player({ x, y }: { x: number, y: number }) {
  const spriteRef = useRef<Phaser.Physics.Arcade.Sprite>(null);

  useUpdate(() => {
    if (spriteRef.current) spriteRef.current.x += 1;
  });

  return createNode('physics-sprite', {
    ref: spriteRef,
    x, y,
    texture: 'ship',
    velocityX: 100
  });
}

class GameScene extends Phaser.Scene {
  create() {
    mountRoot(this, createNode(Player, { x: 100, y: 100 }));
  }
}
```

## 🛠 Features & API

### VNode Primitives

| Type | Description | Key Props |
| :--- | :--- | :--- |
| `container` | Groups children into a `Phaser.GameObjects.Container`. | `x`, `y`, `width`/`height`, `interactive` |
| `text` | Renders a `Phaser.GameObjects.Text`. | `text`, `fontSize`, `color`, `wordWrapWidth` |
| `sprite` / `image`| Renders standard textures. | `texture`, `frame`, `tint`, `flipX`/`flipY` |
| `rect` / `graphics`| Renders graphics-backed shapes. | `fill`, `lineColor`, `strokeWidth` |
| `physics-sprite` | Arcade Physics enabled sprite. | `velocityX`/`Y`, `bounce`, `drag`, `gravityY` |
| `physics-group` | Managed Arcade Group for pooling. | `config` (Phaser Group Config) |
| `fragment` | Transparent wrapper for multiple children. | (None) |

### Hooks Reference

| Hook | Description |
| :--- | :--- |
| `useState<T>(initial)` | Standard state management. |
| `useUpdate(callback)` | Runs every frame on Phaser's `update` event. |
| `useStore(hook, selector?)`| Subscribes to a `game-state` store. |
| `useRef<T>(initial)` | Persistent reference to Phaser GameObjects. |
| `useMemo` / `useCallback` | Performance optimization for values and functions. |
| `useEvent(handler)` | Stable identity for event callbacks. |
| `useScene()` | Access the current `Phaser.Scene`. |
| `useEffect(cb, deps)` | Side effects after render (asynchronous). |
| `useLayoutEffect(cb, deps)`| Side effects before Phaser commits updates. |
| `onMount(cb)` | Utility for one-time initialization logic. |

---

## 📦 State Management (`game-state`)

The library includes a lightweight, Pinia-inspired state management system optimized for game development.

### Defining a Store

```typescript
import { defineGameStore } from '@realiz3r/react-phaser';

export const useGameStore = defineGameStore('game', {
  state: () => ({
    score: 0,
    health: 100
  }),
  getters: {
    isGameOver: (state) => state.health <= 0
  },
  actions: {
    addScore(points: number) {
      this.$state.score += points;
    }
  }
});
```

### Using in Components

```typescript
function ScoreDisplay() {
  const score = useStore(useGameStore, s => s.score);
  return createNode('text', { text: `Score: ${score}`, x: 10, y: 10 });
}
```

---

## 🚀 Optimized Pooling

Using `physics-group` allows you to manage hundreds of objects with minimal GC pressure.

```typescript
function Bullet({ x, y }: { x: number, y: number }) {
  return createNode('physics-sprite', { x, y, texture: 'bullet' });
}

function BulletSpawner() {
  const bullets = useStore(useBulletStore);

  return createNode('physics-group', {
    config: { 
      classType: Phaser.Physics.Arcade.Sprite, 
      maxSize: 100, 
      defaultKey: null 
    }
  },
    ...bullets.map(b => createNode(Bullet, {
      key: b.id,
      ...b
    }))
  );
}
```

---

## 🔍 Debugging & Tooling

The library provides built-in tools for state inspection and travel.

### Configuration
You can customize the behavior of the state manager:

```typescript
import { GameState } from '@realiz3r/react-phaser';

GameState.config({
  loggingEnabled: true, // Set to false to disable action logging
  maxLogSize: 500       // Customize the number of mutations to keep in memory (default: 1000)
});
```

### State Snapshotting
Access the global state and logs via the `GameState` manager:

```typescript
import { GameState } from '@realiz3r/react-phaser';

// Get a snapshot of all registered stores
const currentWorldState = GameState.snapshot();

// Export state and action logs for bug reporting
console.log(GameState.dump());
```

---

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## 📄 License

MIT © [kllilizxc](https://github.com/kllilizxc)
